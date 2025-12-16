"use server";

import {
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { revalidatePath } from "next/cache";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { CONFIG, accountsTable, LOGGER } from "@/lib";
import { accountUrl, editAccountProfileUrl } from "@/lib/urls";

/**
 * Supported image MIME types for profile pictures
 */
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface PresignedUploadUrl {
  url: string;
  key: string;
  expiresIn: number;
}

export interface GetProfileImageUploadUrlParams {
  accountId: string;
  contentType: string;
  fileSize: number;
}

/**
 * Validate that the content type is an allowed image type
 */
function isAllowedImageType(
  contentType: string
): contentType is (typeof ALLOWED_IMAGE_TYPES)[number] {
  return ALLOWED_IMAGE_TYPES.includes(contentType as any);
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return extensionMap[mimeType] || "jpg";
}

/**
 * Generate a presigned URL for uploading a profile image
 *
 * The image will be stored at: profile-images/{account_id}/avatar.{ext}
 *
 * @param params - Account identifier and file metadata
 * @returns Presigned URL with 15-minute expiration
 * @throws Error if user is not authorized or file validation fails
 */
export async function getProfileImageUploadUrl({
  accountId,
  contentType,
  fileSize,
}: GetProfileImageUploadUrlParams): Promise<PresignedUploadUrl> {
  // Authenticate user
  const session = await getPageSession();
  if (!session?.account) {
    throw new Error("Unauthorized: No valid session");
  }

  // Check authorization - user must have update permission for the account
  const account = await accountsTable.fetchById(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  if (!isAuthorized(session, account, Actions.PutAccountProfile)) {
    throw new Error(
      `Unauthorized: User does not have permission to update account ${accountId}`
    );
  }

  // Validate file type
  if (!isAllowedImageType(contentType)) {
    throw new Error(
      `Invalid file type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(
        ", "
      )}`
    );
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of ${
        MAX_FILE_SIZE / 1024 / 1024
      }MB`
    );
  }

  // Generate object key: profile-images/{account_id}/avatar.{ext}
  const extension = getExtensionFromMimeType(contentType);
  const key = `profile-images/${accountId}/avatar.${extension}`;

  try {
    // Create S3 client with credentials
    const s3Client = new S3Client({
      region: CONFIG.assets.region,
      credentials: CONFIG.database.credentials,
    });

    // Create presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: CONFIG.assets.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSize, // Enforce exact file size in the presigned URL
      // Add metadata for tracking
      Metadata: {
        uploadedBy: session.account.account_id,
        uploadedAt: new Date().toISOString(),
      },
      // Set cache control to allow CDN caching
      CacheControl: "public, max-age=31536000",
    });

    const expiresIn = 15 * 60; // 15 minutes
    const url = await getSignedUrl(s3Client, command, { expiresIn });

    LOGGER.info("Generated profile image upload URL", {
      operation: "getProfileImageUploadUrl",
      metadata: {
        accountId,
        contentType,
        fileSize,
        key,
        expiresIn,
      },
    });

    return {
      url,
      key,
      expiresIn,
    };
  } catch (error) {
    LOGGER.error("Failed to generate profile image upload URL", {
      operation: "getProfileImageUploadUrl",
      metadata: { accountId, contentType, error },
    });
    throw new Error(
      `Failed to generate upload URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Update account profile with the new profile image URL
 *
 * @param accountId - Account identifier
 * @param imageKey - S3 object key for the uploaded image
 * @throws Error if user is not authorized
 */
export async function updateProfileImage(
  accountId: string,
  imageKey: string
): Promise<void> {
  // Authenticate user
  const session = await getPageSession();
  if (!session?.account) {
    throw new Error("Unauthorized: No valid session");
  }

  // Check authorization
  const account = await accountsTable.fetchById(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  if (!isAuthorized(session, account, Actions.PutAccountProfile)) {
    throw new Error(
      `Unauthorized: User does not have permission to update account ${accountId}`
    );
  }

  try {
    // Construct public URL for the image using CloudFront domain
    const assetsDomain = CONFIG.assets.domain;
    if (!assetsDomain) {
      throw new Error("ASSETS_DOMAIN environment variable not set");
    }
    const imageUrl = `https://${assetsDomain}/${imageKey}`;

    // Update account metadata with profile image URL
    await accountsTable.update({
      ...account,
      metadata_public: {
        ...account.metadata_public,
        profile_image: imageUrl,
      },
      updated_at: new Date().toISOString(),
    });

    LOGGER.info("Updated account profile image", {
      operation: "updateProfileImage",
      metadata: {
        accountId,
        imageKey,
        imageUrl,
      },
    });

    // Revalidate the account pages to show the new image
    revalidatePath(accountUrl(accountId));
    revalidatePath(editAccountProfileUrl(accountId));
  } catch (error) {
    LOGGER.error("Failed to update profile image", {
      operation: "updateProfileImage",
      metadata: { accountId, imageKey, error },
    });
    throw new Error(
      `Failed to update profile image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Delete profile image from S3 and remove from account metadata
 *
 * This will:
 * 1. Delete all profile image files from S3 (profile-images/{account_id}/*)
 * 2. Remove the profile_image field from account metadata
 * 3. For individual accounts, they will fall back to Gravatar
 * 4. For organization accounts, they will show the default organization icon
 *
 * @param accountId - Account identifier
 * @throws Error if user is not authorized or deletion fails
 */
export async function deleteProfileImage(accountId: string): Promise<void> {
  // Authenticate user
  const session = await getPageSession();
  if (!session?.account) {
    throw new Error("Unauthorized: No valid session");
  }

  // Check authorization
  const account = await accountsTable.fetchById(accountId);
  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  if (!isAuthorized(session, account, Actions.PutAccountProfile)) {
    throw new Error(
      `Unauthorized: User does not have permission to update account ${accountId}`
    );
  }

  try {
    // Create S3 client with credentials
    const s3Client = new S3Client({
      region: CONFIG.assets.region,
      credentials: CONFIG.database.credentials,
    });

    // Delete all possible image file extensions
    const extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    const deletePromises = extensions.map(async (ext) => {
      const key = `profile-images/${accountId}/avatar.${ext}`;
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: CONFIG.assets.bucket,
          Key: key,
        });
        await s3Client.send(deleteCommand);
        LOGGER.info("Deleted profile image file from S3", {
          operation: "deleteProfileImage",
          metadata: { accountId, key },
        });
      } catch (error) {
        // Ignore errors for files that don't exist
        if ((error as any)?.name !== "NoSuchKey") {
          LOGGER.warn("Error deleting profile image file", {
            operation: "deleteProfileImage",
            metadata: { accountId, key, error },
          });
        }
      }
    });

    // Wait for all deletions to complete
    await Promise.all(deletePromises);

    // Remove profile_image from account metadata
    const { profile_image, ...remainingMetadata } =
      account.metadata_public || {};

    await accountsTable.update({
      ...account,
      metadata_public: remainingMetadata,
      updated_at: new Date().toISOString(),
    });

    LOGGER.info("Removed profile image from account metadata", {
      operation: "deleteProfileImage",
      metadata: { accountId },
    });

    // Revalidate the account pages to show the default avatar
    revalidatePath(accountUrl(accountId));
    revalidatePath(editAccountProfileUrl(accountId));
  } catch (error) {
    LOGGER.error("Failed to delete profile image", {
      operation: "deleteProfileImage",
      metadata: { accountId, error },
    });
    throw new Error(
      `Failed to delete profile image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
