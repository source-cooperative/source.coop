"use client";

import { useState } from "react";
import { Button, DropdownMenu } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { AddGithubTrustDialog } from "./AddGithubTrustDialog";
import { IssueApiKeyDialog } from "./IssueApiKeyDialog";

/**
 * "Add sign-in", for the corner of a service account's "Signs in with": a
 * menu of the two ways software signs in, each opening its own modal — a
 * GitHub workflow to trust, or an API key to issue.
 */
export function AddSignInMenu({ accountId }: { accountId: string }) {
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
          <DropdownMenu.Item onSelect={() => setAdding("key")}>API key</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <AddGithubTrustDialog accountId={accountId} open={adding === "github"} onOpenChange={close} />
      <IssueApiKeyDialog accountId={accountId} open={adding === "key"} onOpenChange={close} />
    </>
  );
}
