"use client";
import {
  LockClosedIcon,
  LockOpen1Icon,
  UploadIcon,
} from "@radix-ui/react-icons";
import { IconButton, Spinner, Tooltip, Flex } from "@radix-ui/themes";
import { useS3Credentials } from "./context";

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

export const FetchCredentialsButton = () => {
  const { fetchCredentials, status, s3Credentials, clearCredentials } =
    useS3Credentials();

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
        const files = (e.target as HTMLInputElement).files;
        if (files) {
          // TODO: Handle file upload
          console.log("Selected files:", files);
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
          onClick={clearCredentials}
        >
          <LockOpen1Icon />
        </TootltipIconButton>
      </Flex>
    );
  }

  return (
    <TootltipIconButton tooltip="Enable uploads." onClick={fetchCredentials}>
      <LockClosedIcon />
    </TootltipIconButton>
  );
};
