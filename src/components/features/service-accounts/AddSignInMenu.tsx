"use client";

import { useState } from "react";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { AddGithubTrustDialog } from "./AddGithubTrustDialog";
import { IssueApiKeyDialog, type ApiKeyDraft } from "./IssueApiKeyDialog";

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
  proxyOrigin,
}: {
  accountId?: string;
  onAddGithub?: (subject: string) => void;
  onAddKey?: (key: ApiKeyDraft) => void;
  /** Turns off "API key", as the create form does once it holds one. */
  keyDisabled?: boolean;
  /** The data proxy's origin, shown as the audience a trusted workflow's token must carry. */
  proxyOrigin?: string;
}) {
  const [adding, setAdding] = useState<"github" | "key" | null>(null);
  const close = (open: boolean) => !open && setAdding(null);
  const t = useTranslations("AddSignInMenu");
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button type="button" size="1" variant="soft">
            <PlusIcon /> {t("addSignIn")}
            <DropdownMenu.TriggerIcon />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" size="1">
          <DropdownMenu.Item onSelect={() => setAdding("github")}>{t("githubWorkflow")}</DropdownMenu.Item>
          <DropdownMenu.Item disabled={keyDisabled} onSelect={() => setAdding("key")}>
            {t("apiKey")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <AddGithubTrustDialog
        accountId={accountId}
        onAdd={onAddGithub}
        proxyOrigin={proxyOrigin}
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
