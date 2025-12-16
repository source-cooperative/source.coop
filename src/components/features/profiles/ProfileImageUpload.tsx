"use client";

import { useState, useRef } from "react";
import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { ImageIcon, UploadIcon } from "@radix-ui/react-icons";
import { Account } from "@/types";
import { ProfileAvatar } from "./ProfileAvatar";
import {
  getProfileImageUploadUrl,
  updateProfileImage,
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      await updateProfileImage(account.account_id, key);

      setSuccess(true);

      // Construct the image URL using CloudFront domain
      const assetsDomain = CONFIG.assets.domain;
      const imageUrl = assetsDomain ? `https://${assetsDomain}/${key}` : "";

      if (onUploadComplete && imageUrl) {
        onUploadComplete(imageUrl);
      }

      // Refresh the page after a short delay to show the new image
      setTimeout(() => {
        window.location.reload();
      }, 1500);
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

  return (
    <Box>
      <Flex direction="column" gap="4">
        {/* Title and description */}
        <Box>
          <Box>
            <Text size="3" weight="medium">
              Profile Picture
            </Text>
          </Box>
          <Box>
            <Text size="1" color="gray">
              {account.metadata_public?.profile_image
                ? "Upload a new image to replace your current profile picture"
                : account.type === "individual"
                ? "Currently using Gravatar. Upload a custom image."
                : "Upload an image for your organization"}
            </Text>
          </Box>
        </Box>

        {/* Current avatar preview */}
        <Flex>
          <ProfileAvatar account={account} size="7" />
        </Flex>

        {/* Upload button */}
        <Box>
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
            disabled={uploading}
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
          <Text size="1" color="gray" ml="3">
            Max size: 5MB. Supported: JPG, PNG, WebP, GIF
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
              ✓ Profile image uploaded successfully! Refreshing...
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
