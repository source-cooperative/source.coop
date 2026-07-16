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
  SegmentedControl,
} from "@radix-ui/themes";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";
import React, { useState } from "react";
import { MonoText } from "@/components/core";

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
  // The credentials are only valid against the data proxy, so the endpoint must
  // travel with them — an SDK pointed at the default AWS endpoint would 403.
  const jsonFormat = JSON.stringify(
    {
      aws_access_key_id: credentials.accessKeyId,
      aws_secret_access_key: credentials.secretAccessKey,
      aws_session_token: credentials.sessionToken,
      region_name: credentials.region,
      endpoint_url: credentials.endpoint,
    },
    null,
    2
  );

  const [envShell, setEnvShell] = useState<"sh" | "ps">("sh");
  const envFormat = [
    ["AWS_ACCESS_KEY_ID", credentials.accessKeyId],
    ["AWS_SECRET_ACCESS_KEY", credentials.secretAccessKey],
    ["AWS_SESSION_TOKEN", credentials.sessionToken],
    ["AWS_DEFAULT_REGION", credentials.region],
    ["AWS_ENDPOINT_URL", credentials.endpoint],
  ]
    .map(([name, value]) =>
      envShell === "sh"
        ? `export ${name}="${value}"`
        : `$env:${name}="${value}"`
    )
    .join("\n");

  const iniFormat = [
    `[source-coop]`,
    `aws_access_key_id = ${credentials.accessKeyId}`,
    `aws_secret_access_key = ${credentials.secretAccessKey}`,
    `aws_session_token = ${credentials.sessionToken}`,
    `endpoint_url = ${credentials.endpoint}`,
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
            <Tabs.Trigger value="ini">INI</Tabs.Trigger>
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
              controls={
                <SegmentedControl.Root
                  size="1"
                  value={envShell}
                  onValueChange={(value) => setEnvShell(value as "sh" | "ps")}
                >
                  <SegmentedControl.Item value="sh">
                    macOS / Linux
                  </SegmentedControl.Item>
                  <SegmentedControl.Item value="ps">
                    Windows (PowerShell)
                  </SegmentedControl.Item>
                </SegmentedControl.Root>
              }
            />

            <CredentialsTabContent
              value="ini"
              title="For ~/.aws/credentials (AWS CLI profile)"
              content={iniFormat}
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
                  "Expiration",
                  <span key="expiration" title={credentials.expiration}>
                    {new Date(credentials.expiration).toLocaleString(undefined, {
                      timeZoneName: "short",
                    })}
                  </span>,
                  credentials.expiration,
                ],
                [
                  "Bucket",
                  <MonoText key="bucket">{credentials.bucket}</MonoText>,
                  credentials.bucket,
                ],
                [
                  "Prefix",
                  <MonoText key="prefix">{credentials.prefix}</MonoText>,
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
  controls?: React.ReactNode;
}

function CredentialsTabContent({
  value,
  title,
  content,
  controls,
}: CredentialsTabContentProps) {
  return (
    <Tabs.Content value={value}>
      <Flex direction="column" gap="2">
        <Flex align="center" justify="between" gap="2">
          <Text size="1" weight="regular" color="gray">
            {title}
          </Text>
          {controls}
        </Flex>
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
