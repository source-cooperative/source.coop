"use client";

import React, { useActionState, useState } from "react";
import {
  Button,
  Callout,
  Code,
  Dialog,
  Flex,
  Select,
  Text,
  TextField,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon, PlusIcon } from "@radix-ui/react-icons";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { Field } from "@/components/core";
import { issueApiKey } from "@/lib/actions/service-account-keys";
import { IDLE_API_KEY_ACTION_STATE } from "@/types";

const EXPIRIES = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "A year" },
  { value: "", label: "Never — until revoked" },
];

/**
 * Issues an API key for a service account and shows it once. There is no
 * second look: the key is not stored, only its record.
 */
export function IssueApiKeyDialog({ accountId }: { accountId: string }) {
  const [state, formAction, pending] = useActionState(issueApiKey, IDLE_API_KEY_ACTION_STATE);
  const [expiry, setExpiry] = useState("90");

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="1" variant="soft">
          <PlusIcon /> Issue an API key
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 560 }}>
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
            <Text size="1" color="gray">
              Save it to a file, point <Code size="1">AWS_WEB_IDENTITY_TOKEN_FILE</Code>{" "}
              at that file, and set <Code size="1">AWS_ROLE_ARN</Code> and the data
              proxy&apos;s STS endpoint; a stock AWS SDK does the rest. Revoke it here
              if it leaks. Only its hash is stored — the key itself is not.
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
            <input type="hidden" name="expires_in_days" value={expiry} />
            <Flex direction="column" gap="3">
              <Dialog.Description size="2">
                For environments without OIDC: a server, a scheduler, an
                instrument. The key signs in as this service account with
                exactly its grants.
              </Dialog.Description>
              <Field label="Label" htmlFor="key-label" required help="Where this key lives, so you know which one to revoke.">
                <TextField.Root id="key-label" name="label" placeholder="HPC cron job" maxLength={64} />
              </Field>
              <Field label="Expires" htmlFor="key-expiry">
                <Select.Root value={expiry} onValueChange={setExpiry}>
                  <Select.Trigger id="key-expiry" />
                  <Select.Content>
                    {EXPIRIES.map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Field>
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
