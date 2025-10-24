"use client";
import {
  LockClosedIcon,
  LockOpen1Icon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { Spinner, Button, DropdownMenu } from "@radix-ui/themes";
import { useS3Credentials, CredentialsScope } from "./CredentialsProvider";
import { useUploadManager } from "./UploadProvider";

interface FetchCredentialsButtonProps {
  scope: CredentialsScope;
  prefix: string;
}

export const FetchCredentialsButton = ({
  scope,
  prefix,
}: FetchCredentialsButtonProps) => {
  const { getCredentials, getStatus, fetchCredentials, clearCredentials } =
    useS3Credentials();
  const { uploadFiles, uploadEnabled } = useUploadManager();

  const s3Credentials = getCredentials(scope);
  const status = getStatus(scope);
  const isEditMode = !!s3Credentials;
  const isLoading = status === "loading";

  const handleEnableEdit = () => {
    if (!isLoading && !isEditMode) {
      fetchCredentials(scope);
    }
  };

  const handleDisableEdit = () => {
    if (!isLoading && isEditMode) {
      clearCredentials(scope);
    }
  };

  const handleUploadClick = () => {
    if (!uploadEnabled || !isEditMode) return;

    // Trigger file picker
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        uploadFiles(Array.from(files), prefix, scope);
      }
    };
    input.click();
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="ghost" size="1" disabled={isLoading} mr="1">
          {isLoading ? (
            <Spinner />
          ) : isEditMode ? (
            <LockOpen1Icon />
          ) : (
            <LockClosedIcon />
          )}
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content size="1">
        <DropdownMenu.CheckboxItem
          checked={isEditMode}
          onCheckedChange={handleEnableEdit}
          disabled={isLoading || isEditMode}
        >
          Edit Mode
        </DropdownMenu.CheckboxItem>
        <DropdownMenu.CheckboxItem
          checked={!isEditMode}
          onCheckedChange={handleDisableEdit}
          disabled={isLoading || !isEditMode}
        >
          Read Only
        </DropdownMenu.CheckboxItem>

        {isEditMode && (
          <>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onClick={handleUploadClick}
              disabled={!uploadEnabled}
            >
              <UploadIcon />
              Upload Files
            </DropdownMenu.Item>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
