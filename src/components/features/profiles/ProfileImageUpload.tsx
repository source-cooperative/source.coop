"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("ProfileImageUpload");
  const tCommon = useTranslations("Common");
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
      setError(t("invalidType", { types: ALLOWED_TYPES.join(", ") }));
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(t("tooLarge", { size: MAX_FILE_SIZE / 1024 / 1024 }));
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
        throw new Error(
          t("uploadFailedStatus", { status: uploadResponse.statusText })
        );
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
      setError(err instanceof Error ? err.message : t("uploadFailed"));
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
      setError(err instanceof Error ? err.message : t("deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Flex direction="column" gap="4">
        {/* Description Section */}
        <Box>
          <Flex direction="column" gap="2">
            <Text size="3" weight="medium">
              {account.type === "individual"
                ? t("titleIndividual")
                : t("titleOrganization")}
            </Text>
            <Text size="2" color="gray">
              {account.type === "individual"
                ? t("descriptionIndividual")
                : t("descriptionOrganization")}
            </Text>
          </Flex>
        </Box>

        {/* Current avatar preview */}
        <Flex>
          <ProfileAvatar account={account} size="9" />
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
                <UploadIcon /> {t("uploading")}
              </>
            ) : (
              <>
                <ImageIcon /> {t("uploadNew")}
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
                      <TrashIcon /> {t("deleting")}
                    </>
                  ) : (
                    <>
                      <TrashIcon /> {t("removeImage")}
                    </>
                  )}
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content maxWidth="450px">
                <AlertDialog.Title>{t("removeTitle")}</AlertDialog.Title>
                <AlertDialog.Description size="2">
                  {account.type === "individual"
                    ? t("removeConfirmIndividual")
                    : t("removeConfirmOrganization")}
                </AlertDialog.Description>

                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray">
                      {tCommon("cancel")}
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={handleDelete}>
                      {t("removeImage")}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          )}
        </Flex>

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
              {deleting ? t("removed") : t("uploaded")}
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

        {/* Image Guidelines */}
        <Box
          p="3"
          style={{
            backgroundColor: "var(--gray-3)",
            borderRadius: "var(--radius-2)",
          }}
        >
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              {t("guidelines")}
            </Text>
            <Text size="1" color="gray">
              {t("guidelineDimensions")}
            </Text>
            <Text size="1" color="gray">
              {t("guidelineSquare")}
            </Text>
            <Text size="1" color="gray">
              {t("guidelineFormats")}
            </Text>
            <Text size="1" color="gray">
              {t("guidelineSize")}
            </Text>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}
