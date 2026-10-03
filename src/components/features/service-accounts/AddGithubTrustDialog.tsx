"use client";

import React, { useActionState, useEffect, useState } from "react";
import { Button, Dialog, Flex, Text } from "@radix-ui/themes";
import { addGithubTrust } from "@/lib/actions/service-accounts";
import { GITHUB_ACTIONS_SUBJECT_REGEX, IDLE_SERVICE_ACCOUNT_ACTION_STATE } from "@/types";
import {
  GithubWorkflowFields,
  NEW_GITHUB_WORKFLOW,
  githubSubject,
} from "./GithubWorkflowFields";

/**
 * Names a workflow the service account will trust, in a modal opened from
 * "Add sign-in". Nothing to run first: the trust is written when the form is
 * submitted, the way a role's trust policy is edited, and the modal closes
 * onto the new row, whose menu has the step the workflow adds, under
 * "Example usage". With `onAdd` instead of an `accountId`, the subject is
 * handed back rather than saved, for a form that saves it later.
 */
export function AddGithubTrustDialog({
  accountId,
  onAdd,
  open,
  onOpenChange,
  proxyOrigin,
}: {
  accountId?: string;
  onAdd?: (subject: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The data proxy's origin, shown as the audience the workflow's token must carry. */
  proxyOrigin?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 560 }}>
        <Dialog.Title>Trust a GitHub workflow</Dialog.Title>
        {/* The content unmounts when the dialog closes, so the form lives in
            here and starts over on every open. */}
        <TrustForm
          accountId={accountId}
          onAdd={onAdd}
          proxyOrigin={proxyOrigin}
          onTrusted={() => onOpenChange(false)}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}

function TrustForm({
  accountId,
  onAdd,
  proxyOrigin,
  onTrusted,
}: {
  accountId?: string;
  onAdd?: (subject: string) => void;
  proxyOrigin?: string;
  onTrusted: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    addGithubTrust,
    IDLE_SERVICE_ACCOUNT_ACTION_STATE
  );
  const [workflow, setWorkflow] = useState(NEW_GITHUB_WORKFLOW);
  // With onAdd nothing reaches the server until the create form is
  // submitted, so the subject is checked here, the way addGithubTrust would.
  const [invalid, setInvalid] = useState(false);
  const message = invalid ? "Name one repository and one branch, tag or environment" : !state.success && state.message;

  useEffect(() => {
    if (state.success) onTrusted();
  }, [state, onTrusted]);

  return (
    <form
      action={
        onAdd
          ? () => {
              const subject = githubSubject(workflow);
              if (!GITHUB_ACTIONS_SUBJECT_REGEX.test(subject)) return setInvalid(true);
              onAdd(subject);
              onTrusted();
            }
          : formAction
      }
    >
      {accountId && <input type="hidden" name="account_id" value={accountId} />}
      <input type="hidden" name="subject" value={githubSubject(workflow)} />
      <Flex direction="column" gap="3">
        <Dialog.Description size="2">
          One repository, pinned to one branch, tag or environment. GitHub vouches for the
          workflow at every run; nothing is stored here but the name.
        </Dialog.Description>
        <GithubWorkflowFields
          id="gh"
          workflow={workflow}
          onChange={setWorkflow}
          audience={proxyOrigin}
        />
        {message && (
          <Text size="1" color="red">
            {message}
          </Text>
        )}
        <Flex justify="end" gap="2">
          <Dialog.Close>
            <Button type="button" variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button type="submit" highContrast disabled={pending} loading={pending}>
            Trust it
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
