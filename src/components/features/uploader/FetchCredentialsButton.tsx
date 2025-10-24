"use client";
import {
  LockClosedIcon,
  LockOpen1Icon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { IconButton, Spinner, Tooltip, Flex } from "@radix-ui/themes";
import { useS3Credentials, CredentialsScope } from "./CredentialsProvider";
import { useUploadManager } from "./UploadProvider";
import { useMemo } from "react";

interface TootltipIconButtonProps {
  tooltip: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: React.ComponentProps<typeof IconButton>["variant"];
  radius?: React.ComponentProps<typeof IconButton>["radius"];
}
const TootltipIconButton = ({
  tooltip,
  children,
  onClick,
  disabled,
  variant = "ghost",
  radius = "full",
}: TootltipIconButtonProps) => (
  <Tooltip content={tooltip}>
    <IconButton
      variant={variant}
      radius={radius}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </IconButton>
  </Tooltip>
);

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

  if (status === "loading") {
    return (
      <TootltipIconButton tooltip="Fetching credentials..." disabled>
        <Spinner />
      </TootltipIconButton>
    );
  }

  if (s3Credentials) {
    const handleUploadClick = () => {
      // Trigger file picker
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.onchange = (e) => {
        if (!uploadEnabled) return;
        const files = (e.target as HTMLInputElement).files;
        if (files) {
          // Use the upload manager to handle files with scope
          uploadFiles(Array.from(files), prefix, scope);
        }
      };
      input.click();
    };

    return (
      <Flex gap="2" align="center">
        <TootltipIconButton
          tooltip="Upload files"
          onClick={handleUploadClick}
          variant="soft"
          radius="small"
        >
          <UploadIcon />
        </TootltipIconButton>
        <TootltipIconButton
          tooltip="Disable uploads"
          onClick={() => clearCredentials(scope)}
        >
          <LockOpen1Icon />
        </TootltipIconButton>
      </Flex>
    );
  }

  return (
    <TootltipIconButton
      tooltip="Enable uploads."
      onClick={() => fetchCredentials(scope)}
    >
      <LockClosedIcon />
    </TootltipIconButton>
  );
};
