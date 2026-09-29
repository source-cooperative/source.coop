"use client";

import React, { useActionState } from "react";
import { Box, Button, Callout, Code, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { ExclamationTriangleIcon, PlusIcon } from "@radix-ui/react-icons";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { Field } from "@/components/core";
import { issueApiKey } from "@/lib/actions/service-account-keys";
import { IDLE_API_KEY_ACTION_STATE } from "@/types";
import { ApiKeyExpiryField } from "./ApiKeyExpiryField";

/**
 * What a stock AWS SDK or the AWS CLI needs to sign in with a key saved to a
 * file: it reads the file, exchanges the key at the proxy's STS endpoint and
 * refreshes on its own, so nothing else runs beside it. A key names its own
 * account, so the role ARN's account segment is ignored; it is filled in to
 * match the workflow snippet.
 */
const sdkEnvironment = (proxyOrigin: string, accountId: string) =>
  [
    `export AWS_ROLE_ARN=arn:aws:iam::${accountId}:role/FullAccess`,
    "export AWS_WEB_IDENTITY_TOKEN_FILE=/path/to/the/saved/key",
    `export AWS_ENDPOINT_URL_STS=${proxyOrigin}/.sts`,
    `export AWS_ENDPOINT_URL_S3=${proxyOrigin}`,
    "export AWS_REGION=us-west-2",
  ].join("\n");

/**
 * Issues an API key for a service account and shows it once, with the
 * variables an SDK needs to use it. There is no second look: the key is not
 * stored, only its record.
 */
export function IssueApiKeyDialog({
  accountId,
  proxyOrigin,
}: {
  accountId: string;
  /** The data proxy the key signs in to; without it, no variables are shown. */
  proxyOrigin?: string;
}) {
  const [state, formAction, pending] = useActionState(issueApiKey, IDLE_API_KEY_ACTION_STATE);
  const environment = proxyOrigin && sdkEnvironment(proxyOrigin, accountId);

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="1" variant="soft">
          <PlusIcon /> Issue an API key
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 640 }}>
        <Dialog.Title>Issue an API key</Dialog.Title>
        {state.issued ? (
          <Flex direction="column" gap="3">
            <Callout.Root color="grass">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                <Text size="2" weight="medium">
                  Copy the key now — this is the only time it is shown.
                </Text>
              </Callout.Text>
            </Callout.Root>
            <Flex align="center" gap="2">
              <Code size="2" style={{ wordBreak: "break-all" }}>
                {state.issued.key}
              </Code>
              <CopyToClipboard text={state.issued.key} />
            </Flex>
            {environment && (
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center" gap="2">
                  <Text size="2">Save it to a file, then point any AWS SDK or the AWS CLI at it:</Text>
                  <CopyToClipboard text={environment} />
                </Flex>
                <Box asChild p="3" style={{ background: "var(--gray-2)", overflowX: "auto" }}>
                  <pre style={{ margin: 0 }}>
                    <Code size="1" variant="ghost">
                      {environment}
                    </Code>
                  </pre>
                </Box>
              </Flex>
            )}
            <Text size="1" color="gray">
              Revoke it here if it leaks. Only its hash is stored — the key itself is not.
            </Text>
            <Flex justify="end">
              <Dialog.Close>
                <Button variant="soft">Done</Button>
              </Dialog.Close>
            </Flex>
          </Flex>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="account_id" value={accountId} />
            <Flex direction="column" gap="3">
              <Dialog.Description size="2">
                For environments without OIDC: a server, a scheduler, an
                instrument. The key signs in as this service account with
                exactly its grants.
              </Dialog.Description>
              <Field label="Label" htmlFor="key-label" required help="Where this key lives, so you know which one to revoke.">
                <TextField.Root id="key-label" name="label" placeholder="HPC cron job" maxLength={64} />
              </Field>
              <ApiKeyExpiryField id="key-expiry" />
              {state.message && (
                <Text size="1" color="red">
                  {state.message}
                </Text>
              )}
              <Flex justify="end" gap="2">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={pending}>
                  Issue key
                </Button>
              </Flex>
            </Flex>
          </form>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
