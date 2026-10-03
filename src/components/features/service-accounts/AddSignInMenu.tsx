"use client";

import { useState } from "react";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { AddGithubTrustDialog } from "./AddGithubTrustDialog";
import { IssueApiKeyDialog, type ApiKeyDraft } from "./IssueApiKeyDialog";

/** What "Signs in with" says of itself, on the create form and the account's page alike. */
export const SIGN_IN_DESCRIPTION =
  "GitHub Actions workflows, each pinned to one repository and one ref or environment; GitHub vouches for every run, so there is no secret to store. Or an API key, for environments without OIDC, shown once when it is issued.";

/**
 * "Add sign-in", for the corner of a service account's "Signs in with": a
 * menu of the two ways software signs in, each opening its own modal — a
 * GitHub workflow to trust, or an API key to issue. With an `accountId` each
 * is saved to that account as it is added; with `onAddGithub` and `onAddKey`
 * instead, it is handed back for a form to submit, as the create form does
 * before the account exists.
 */
export function AddSignInMenu({
  accountId,
  onAddGithub,
  onAddKey,
  keyDisabled,
}: {
  accountId?: string;
  onAddGithub?: (subject: string) => void;
  onAddKey?: (key: ApiKeyDraft) => void;
  /** Turns off "API key", as the create form does once it holds one. */
  keyDisabled?: boolean;
}) {
  const [adding, setAdding] = useState<"github" | "key" | null>(null);
  const close = (open: boolean) => !open && setAdding(null);
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button type="button" size="1" variant="soft">
            <PlusIcon /> Add sign-in
            <DropdownMenu.TriggerIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" size="1">
          <DropdownMenu.Item onSelect={() => setAdding("github")}>GitHub workflow</DropdownMenu.Item>
          <DropdownMenu.Item disabled={keyDisabled} onSelect={() => setAdding("key")}>
            API key
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <AddGithubTrustDialog
        accountId={accountId}
        onAdd={onAddGithub}
        open={adding === "github"}
        onOpenChange={close}
      />
      <IssueApiKeyDialog
        accountId={accountId}
        onAdd={onAddKey}
        open={adding === "key"}
        onOpenChange={close}
      />
    </>
  );
}
