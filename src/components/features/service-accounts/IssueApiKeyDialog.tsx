"use client";

import React, { useActionState } from "react";
import { Button, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { Field } from "@/components/core";
import { issueApiKey } from "@/lib/actions/service-account-keys";
import { IDLE_API_KEY_ACTION_STATE } from "@/types";
import { ApiKeyExpiryField } from "./ApiKeyExpiryField";
import { IssuedApiKey } from "./IssuedApiKey";

/**
 * Issues an API key for a service account and shows it once, in a modal
 * opened from "Add sign-in". There is no second look: the key is not stored,
 * only its record. How to use it is on the key's row, under "Example usage"
 * in its menu.
 */
export function IssueApiKeyDialog({
  accountId,
  open,
  onOpenChange,
}: {
  accountId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 640 }}>
        <Dialog.Title>Issue an API key</Dialog.Title>
        {/* The content unmounts when the dialog closes, so the form — and the
            key it shows — lives in here: the next open starts a new key. */}
        <IssueForm accountId={accountId} />
      </Dialog.Content>
    </Dialog.Root>
  );
}

function IssueForm({ accountId }: { accountId: string }) {
  const [state, formAction, pending] = useActionState(issueApiKey, IDLE_API_KEY_ACTION_STATE);
  return state.issued ? (
    <Flex direction="column" gap="3">
      <IssuedApiKey apiKey={state.issued.key} record={state.issued.record} />
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
  );
}
