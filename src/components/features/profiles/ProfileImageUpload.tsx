"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Flex, Text, AlertDialog } from "@radix-ui/themes";
import { ImageIcon, UploadIcon, TrashIcon } from "@radix-ui/react-icons";
import { Account } from "@/types";
import { ProfileAvatar } from "./ProfileAvatar";
import {
  getProfileImageUploadUrl,
  updateProfileImage,
  deleteProfileImage,
} from "@/lib/actions/profile-image";
import { CONFIG } from "@/lib/config";

interface ProfileImageUploadProps {
  account: Account;
  onUploadComplete?: (imageUrl: string) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ProfileImageUpload({
  account,
  onUploadComplete,
}: ProfileImageUploadProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasCustomImage = !!account.metadata_public?.profile_image;

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setSuccess(false);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Invalid file type. Allowed types: ${ALLOWED_TYPES.join(", ")}`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    try {
      setUploading(true);

      // Get presigned URL
      const { url, key } = await getProfileImageUploadUrl({
        accountId: account.account_id,
        contentType: file.type,
        fileSize: file.size,
      });

      // Upload file to S3
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Update account with new profile image
      // This also calls revalidatePath to refresh the cache
      await updateProfileImage(account.account_id, key);

      setSuccess(true);

      // Construct the image URL using CloudFront domain
      const assetsDomain = CONFIG.assets.domain;
      const imageUrl = assetsDomain ? `https://${assetsDomain}/${key}` : "";

      if (onUploadComplete && imageUrl) {
        onUploadComplete(imageUrl);
      }

      // Refresh the router cache to show the new image
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    // Reset states
    setError(null);
    setSuccess(false);

    try {
      setDeleting(true);

      // Delete the profile image
      // This also calls revalidatePath to refresh the cache
      await deleteProfileImage(account.account_id);

      setSuccess(true);

      // Refresh the router cache to show the default avatar
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Flex direction="column" gap="2">
        {/* Title and description */}
        <Box>
          <Text size="3" weight="medium">
            Profile Picture
          </Text>
        </Box>

        {/* Current avatar preview */}
        <Flex>
          <ProfileAvatar account={account} size="7" />
        </Flex>

        {/* Upload and Delete buttons */}
        <Flex gap="2" align="center">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <Button
            type="button"
            variant="soft"
            onClick={handleButtonClick}
            disabled={uploading || deleting}
          >
            {uploading ? (
              <>
                <UploadIcon /> Uploading...
              </>
            ) : (
              <>
                <ImageIcon /> Upload New Image
              </>
            )}
          </Button>

          {hasCustomImage && (
            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button
                  type="button"
                  variant="soft"
                  color="red"
                  disabled={uploading || deleting}
                >
                  {deleting ? (
                    <>
                      <TrashIcon /> Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon /> Remove Image
                    </>
                  )}
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content maxWidth="450px">
                <AlertDialog.Title>Remove Profile Image</AlertDialog.Title>
                <AlertDialog.Description size="2">
                  Are you sure you want to remove your profile image?
                  {account.type === "individual"
                    ? " Your account will fall back to using your Gravatar."
                    : " Your organization will display the default icon."}
                </AlertDialog.Description>

                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray">
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={handleDelete}>
                      Remove Image
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          )}
        </Flex>

        <Box>
          <Text size="1" color="gray">
            Max size: 5MB. Supported: JPG, PNG, WebP, GIF
          </Text>
        </Box>

        <Box>
          <Text size="1" color="gray">
            {hasCustomImage
              ? "Upload a new image to replace your current profile picture, or remove it to use the default."
              : account.type === "individual"
              ? "Currently using Gravatar. Upload a custom image."
              : "Upload an image for your organization"}
          </Text>
        </Box>

        {/* Success message */}
        {success && (
          <Box
            p="3"
            style={{
              backgroundColor: "var(--green-3)",
              borderRadius: "var(--radius-2)",
            }}
          >
            <Text size="2" color="green">
              ✓ {deleting ? "Profile image removed" : "Profile image uploaded"}{" "}
              successfully!
            </Text>
          </Box>
        )}

        {/* Error message */}
        {error && (
          <Box
            p="3"
            style={{
              backgroundColor: "var(--red-3)",
              borderRadius: "var(--radius-2)",
            }}
          >
            <Text size="2" color="red">
              {error}
            </Text>
          </Box>
        )}
      </Flex>
    </Box>
  );
}
