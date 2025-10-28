"use client";

import { TemporaryCredentials } from "@/lib";
import {
  Dialog,
  Button,
  Flex,
  Box,
  Tabs,
  Text,
  IconButton,
  Tooltip,
  DataList,
} from "@radix-ui/themes";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import React, { useState } from "react";
import { MonoText } from "@/components/core";
import { Icon } from "@radix-ui/react-select";

interface ViewCredentialsDialogProps {
  credentials: TemporaryCredentials;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewCredentialsDialog({
  credentials,
  open,
  onOpenChange,
}: ViewCredentialsDialogProps) {
  const jsonFormat = JSON.stringify(
    {
      aws_access_key_id: credentials.accessKeyId,
      aws_secret_access_key: credentials.secretAccessKey,
      aws_session_token: credentials.sessionToken,
      region_name: credentials.region,
    },
    null,
    2
  );

  const envFormat = [
    `export AWS_ACCESS_KEY_ID="${credentials.accessKeyId}"`,
    `export AWS_SECRET_ACCESS_KEY="${credentials.secretAccessKey}"`,
    `export AWS_SESSION_TOKEN="${credentials.sessionToken}"`,
    `export AWS_DEFAULT_REGION="${credentials.region}"`,
  ].join("\n");

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="600px">
        <Dialog.Title>View Credentials</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Copy these temporary credentials to use in your applications.
        </Dialog.Description>

        <Tabs.Root defaultValue="json">
          <Tabs.List>
            <Tabs.Trigger value="json">JSON (SDK)</Tabs.Trigger>
            <Tabs.Trigger value="env">Environment Variables</Tabs.Trigger>
          </Tabs.List>

          <Box pt="3">
            <CredentialsTabContent
              value="json"
              title="For SDK clients (boto3, AWS SDK, etc.)"
              content={jsonFormat}
            />

            <CredentialsTabContent
              value="env"
              title="For terminal/shell usage"
              content={envFormat}
            />
          </Box>
        </Tabs.Root>

        <Box mb="4">
          <Box mb="2">
            <Text size="2" color="gray" weight="bold">
              Boundaries
            </Text>
          </Box>
          <DataList.Root size="1">
            {(
              [
                [
                  "Expires",
                  <span title={credentials.expiration}>
                    {new Date(credentials.expiration).toLocaleString()}
                  </span>,
                  credentials.expiration,
                ],
                [
                  "Bucket",
                  <MonoText>{credentials.bucket}</MonoText>,
                  credentials.bucket,
                ],
                [
                  "Prefix",
                  <MonoText>{credentials.prefix}</MonoText>,
                  credentials.prefix,
                ],
              ] as const
            ).map(([label, element, content]) => (
              <DataList.Item align="center" key={label}>
                <DataList.Label>{label}</DataList.Label>
                <DataList.Value>
                  <Flex align="center" gap="2">
                    {element}
                    <CopyButton content={content} variant="ghost" />
                  </Flex>
                </DataList.Value>
              </DataList.Item>
            ))}
          </DataList.Root>
        </Box>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function CodeBlock({ children }: React.PropsWithChildren) {
  return (
    <Box
      style={{
        backgroundColor: "var(--gray-1)",
        borderRadius: "var(--radius-2)",
        padding: "var(--space-2)",
        overflow: "auto",
        maxHeight: "400px",
        fontSize: ".85rem",
      }}
      asChild
    >
      <pre>{children}</pre>
    </Box>
  );
}

interface CopyButtonProps {
  content: string;
  variant?: React.ComponentProps<typeof IconButton>["variant"];
}

function CopyButton({ content, variant = "soft" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip content={copied ? "Copied!" : "Copy to clipboard"}>
      <IconButton size="1" variant={variant} onClick={handleCopy}>
        {copied ? <CheckIcon /> : <CopyIcon />}
      </IconButton>
    </Tooltip>
  );
}

interface CredentialsTabContentProps {
  value: string;
  title: string;
  content: string;
}

function CredentialsTabContent({
  value,
  title,
  content,
}: CredentialsTabContentProps) {
  return (
    <Tabs.Content value={value}>
      <Flex direction="column" gap="2">
        <Text size="1" weight="regular" color="gray">
          {title}
        </Text>
        <Box style={{ position: "relative" }}>
          <Box
            style={{
              position: "absolute",
              top: "var(--space-4)",
              right: "var(--space-1)",
              zIndex: 1,
            }}
          >
            <CopyButton content={content} />
          </Box>
          <CodeBlock>{content}</CodeBlock>
        </Box>
      </Flex>
    </Tabs.Content>
  );
}
