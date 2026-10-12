"use client";

import type { TemporaryCredentials } from "@/lib/actions/credentials";
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
  Callout,
  Link,
  SegmentedControl,
} from "@radix-ui/themes";
import { CopyIcon, CheckIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { MonoText } from "@/components/core/MonoText";

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
  const t = useTranslations("ViewCredentialsDialog");
  const tCommon = useTranslations("Common");
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
        <Dialog.Title>{t("title")}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {t("description")}
        </Dialog.Description>

        <Callout.Root size="1" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {t.rich("cliCallout", {
              link: (chunks) => (
                <Link
                  href="https://github.com/source-cooperative/source-coop-cli"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {chunks}
                </Link>
              ),
            })}
          </Callout.Text>
        </Callout.Root>

        <Tabs.Root defaultValue="json">
          <Tabs.List>
            <Tabs.Trigger value="json">{t("tabJson")}</Tabs.Trigger>
            <Tabs.Trigger value="env">{t("tabEnv")}</Tabs.Trigger>
            <Tabs.Trigger value="ini">INI</Tabs.Trigger>
          </Tabs.List>

          <Box pt="3">
            <CredentialsTabContent
              value="json"
              title={t("jsonHint")}
              content={jsonFormat}
            />

            <CredentialsTabContent
              value="env"
              title={t("envHint")}
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
              title={t("iniHint")}
              content={iniFormat}
            />
          </Box>
        </Tabs.Root>

        <Box mb="4">
          <Box mb="2">
            <Text size="2" color="gray" weight="bold">
              {t("boundaries")}
            </Text>
          </Box>
          <DataList.Root size="1">
            {(
              [
                [
                  "expiration",
                  <span key="expiration" title={credentials.expiration}>
                    {new Date(credentials.expiration).toLocaleString(undefined, {
                      timeZoneName: "short",
                    })}
                  </span>,
                  credentials.expiration,
                ],
                [
                  "bucket",
                  <MonoText key="bucket">{credentials.bucket}</MonoText>,
                  credentials.bucket,
                ],
                [
                  "prefix",
                  <MonoText key="prefix">{credentials.prefix}</MonoText>,
                  credentials.prefix,
                ],
              ] as const
            ).map(([label, element, content]) => (
              <DataList.Item align="center" key={label}>
                <DataList.Label>{t(label)}</DataList.Label>
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
              {tCommon("close")}
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
  const t = useTranslations("ViewCredentialsDialog");
  const tCommon = useTranslations("Common");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip content={copied ? tCommon("copied") : t("copyToClipboard")}>
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
