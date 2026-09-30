"use client";

import React, { useActionState, useEffect, useState } from "react";
import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { addGithubTrust } from "@/lib/actions/service-accounts";
import { IDLE_SERVICE_ACCOUNT_ACTION_STATE } from "@/types";
import {
  GithubWorkflowFields,
  NEW_GITHUB_WORKFLOW,
  githubSubject,
} from "./GithubWorkflowFields";

/**
 * Names a workflow the service account will trust. Nothing to run first: the
 * trust is written when the form is submitted, the way a role's trust policy
 * is edited, and the dialog closes onto the new row, whose "Example usage"
 * shows the step the workflow adds.
 */
export function AddGithubTrustDialog({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="1" variant="soft">
          <PlusIcon /> Trust a GitHub workflow
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 560 }}>
        <Dialog.Title>Trust a GitHub workflow</Dialog.Title>
        {/* The content unmounts when the dialog closes, so the form lives in
            here and starts over on every open. */}
        <TrustForm accountId={accountId} onTrusted={() => setOpen(false)} />
      </Dialog.Content>
    </Dialog.Root>
  );
}

function TrustForm({ accountId, onTrusted }: { accountId: string; onTrusted: () => void }) {
  const [state, formAction, pending] = useActionState(
    addGithubTrust,
    IDLE_SERVICE_ACCOUNT_ACTION_STATE
  );
  const [workflow, setWorkflow] = useState(NEW_GITHUB_WORKFLOW);

  useEffect(() => {
    if (state.success) onTrusted();
  }, [state, onTrusted]);

  return (
    <form action={formAction}>
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="subject" value={githubSubject(workflow)} />
      <Flex direction="column" gap="3">
        <Dialog.Description size="2">
          One repository, pinned to one ref or one environment. GitHub vouches for the
          workflow at every run; nothing is stored here but the name.
        </Dialog.Description>
        <GithubWorkflowFields id="gh" workflow={workflow} onChange={setWorkflow} />
        {!state.success && state.message && (
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
          <Button type="submit" disabled={pending} loading={pending}>
            Trust it
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
