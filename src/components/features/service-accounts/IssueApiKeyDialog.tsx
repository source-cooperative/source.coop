"use client";

import React, { useActionState } from "react";
import { Button, Dialog, Flex, Text, TextField } from "@radix-ui/themes";
import { useTranslations } from "next-intl";
import { Field } from "@/components/core";
import { issueApiKey } from "@/lib/actions/service-account-keys";
import { IDLE_API_KEY_ACTION_STATE } from "@/types";
import { ApiKeyExpiryField } from "./ApiKeyExpiryField";
import { IssuedApiKey } from "./IssuedApiKey";

/** The fields that issue a key, before there is an account to issue it for. */
export interface ApiKeyDraft {
  label: string;
  /** Empty for a key that never expires. */
  expires_in_days: string;
}

/**
 * Issues an API key for a service account and shows it once, in a modal
 * opened from "Add sign-in". There is no second look: the key is not stored,
 * only its record. How to use it is on the key's row, under "Example usage"
 * in its menu. With `onAdd` instead of an `accountId`, the label and expiry
 * are handed back rather than issued, for a form that issues the key later.
 */
export function IssueApiKeyDialog({
  accountId,
  onAdd,
  open,
  onOpenChange,
}: {
  accountId?: string;
  onAdd?: (key: ApiKeyDraft) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("IssueApiKeyDialog");
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 640 }}>
        <Dialog.Title>{t("title")}</Dialog.Title>
        {/* The content unmounts when the dialog closes, so the form — and the
            key it shows — lives in here: the next open starts a new key. */}
        <IssueForm accountId={accountId} onAdd={onAdd} onAdded={() => onOpenChange(false)} />
      </Dialog.Content>
    </Dialog.Root>
  );
}

function IssueForm({
  accountId,
  onAdd,
  onAdded,
}: {
  accountId?: string;
  onAdd?: (key: ApiKeyDraft) => void;
  onAdded: () => void;
}) {
  const [state, formAction, pending] = useActionState(issueApiKey, IDLE_API_KEY_ACTION_STATE);
  const t = useTranslations("IssueApiKeyDialog");
  const tc = useTranslations("Common");
  return state.issued ? (
    <Flex direction="column" gap="3">
      <IssuedApiKey apiKey={state.issued.key} record={state.issued.record} />
      <Flex justify="end">
        <Dialog.Close>
          <Button variant="soft">{t("done")}</Button>
        </Dialog.Close>
      </Flex>
    </Flex>
  ) : (
    <form
      action={
        onAdd
          ? (data) => {
              onAdd({
                label: String(data.get("label")),
                expires_in_days: String(data.get("expires_in_days") ?? ""),
              });
              onAdded();
            }
          : formAction
      }
    >
      {accountId && <input type="hidden" name="account_id" value={accountId} />}
      <Flex direction="column" gap="3">
        <Dialog.Description size="2">
          {t("description")}
        </Dialog.Description>
        <Field label={t("label")} htmlFor="key-label" required help={t("labelHelp")}>
          <TextField.Root id="key-label" name="label" required placeholder={t("labelPlaceholder")} maxLength={64} />
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
              {tc("cancel")}
            </Button>
          </Dialog.Close>
          <Button type="submit" highContrast disabled={pending}>
            {onAdd ? t("addKey") : t("issueKey")}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
