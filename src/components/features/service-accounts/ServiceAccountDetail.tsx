"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { AlertDialog, Button, Code, Flex, Heading, Text } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import { SectionHeader } from "@/components/core";
import {
  ConnectionList,
  ConnectionMarker,
  ConnectionRow,
} from "@/components/features/data-connections/ConnectionRow";
import {
  deleteServiceAccount,
  removeTrust,
  setServiceAccountDisabled,
} from "@/lib/actions/service-accounts";
import { editProductMembershipsUrl, productUrl } from "@/lib/urls";
import {
  GITHUB_ACTIONS_ISSUER,
  IDLE_SERVICE_ACCOUNT_ACTION_STATE as IDLE,
  MembershipRole,
  type ServiceAccountActionState,
  type ServiceAccountSummary,
} from "@/types";
import { AddGithubTrustDialog } from "./AddGithubTrustDialog";

const issuerLabel = (issuer: string) =>
  issuer === GITHUB_ACTIONS_ISSUER ? "GitHub Actions" : issuer;

function Status({ state }: { state: ServiceAccountActionState }) {
  return state.message ? (
    <Text as="p" size="1" color={state.success ? "green" : "red"} mt="2">
      {state.message}
    </Text>
  ) : null;
}

/**
 * One service account, and every control over it: the workflows it trusts,
 * the products it reaches, and — set apart — disabling and deleting it.
 */
export function ServiceAccountDetail({ summary }: { summary: ServiceAccountSummary }) {
  const { account, trusts, grants } = summary;
  const [removeState, removeAction, removing] = useActionState(removeTrust, IDLE);
  const [toggleState, toggleAction, toggling] = useActionState(setServiceAccountDisabled, IDLE);
  const [deleteState, deleteAction, deleting] = useActionState(deleteServiceAccount, IDLE);

  return (
    <Flex direction="column" gap="6">
      <Flex direction="column" gap="1">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="5">{account.name}</Heading>
          {account.disabled && <ConnectionMarker>Disabled</ConnectionMarker>}
        </Flex>
        <Code size="2" variant="ghost" color="gray">
          {account.account_id}
        </Code>
      </Flex>

      <SectionHeader
        title="Signs in as"
        description="Workflows trusted to act as this account."
        rightButton={<AddGithubTrustDialog accountId={account.account_id} />}
      >
        {trusts.length === 0 ? (
          <Text size="2" color="gray">
            Nothing yet — it cannot sign in until a workflow is trusted.
          </Text>
        ) : (
          <ConnectionList>
            {trusts.map((trust) => (
              <ConnectionRow
                key={`${trust.issuer} ${trust.subject}`}
                title={
                  <Text size="2" style={{ fontFamily: "var(--code-font-family)", wordBreak: "break-all" }}>
                    {trust.subject}
                  </Text>
                }
                meta={issuerLabel(trust.issuer)}
                actions={
                  <form action={removeAction}>
                    <input type="hidden" name="account_id" value={account.account_id} />
                    <input type="hidden" name="issuer" value={trust.issuer} />
                    <input type="hidden" name="subject" value={trust.subject} />
                    <Button type="submit" size="1" variant="ghost" color="red" disabled={removing}>
                      Remove
                    </Button>
                  </form>
                }
              />
            ))}
          </ConnectionList>
        )}
        <Status state={removeState} />
      </SectionHeader>

      <SectionHeader
        title="Can reach"
        description="Each product opens in a new tab, to check what it holds. Grants are changed on the product's memberships page."
      >
        {grants.length === 0 ? (
          <Text size="2" color="gray">
            No products yet.
          </Text>
        ) : (
          <ConnectionList>
            {grants.map((grant) => (
              <ConnectionRow
                key={grant.membership_id}
                title={
                  <Link
                    href={productUrl(account.owner_account_id, grant.repository_id ?? "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent-11)", textDecoration: "none" }}
                  >
                    <Flex align="center" gap="1">
                      <Text size="2" weight="medium">
                        {grant.repository_id}
                      </Text>
                      <ExternalLinkIcon width="12" height="12" aria-label="opens in a new tab" />
                    </Flex>
                  </Link>
                }
                meta={`${account.owner_account_id}/${grant.repository_id}`}
                aside={
                  <Text size="1" color="gray">
                    {grant.role === MembershipRole.WriteData ? "read and write" : "read"}
                  </Text>
                }
                actions={
                  <Button asChild size="1" variant="ghost">
                    <Link
                      href={editProductMembershipsUrl(account.owner_account_id, grant.repository_id ?? "")}
                    >
                      Manage
                    </Link>
                  </Button>
                }
              />
            ))}
          </ConnectionList>
        )}
      </SectionHeader>

      <SectionHeader title="Danger zone" color="red">
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center" gap="3" wrap="wrap">
            <Text size="2" color="gray">
              {account.disabled
                ? "Disabled: nothing can sign in as it. Its trusts and grants are kept."
                : "Disabling stops every sign-in and keeps its trusts and grants."}
            </Text>
            <form action={toggleAction}>
              <input type="hidden" name="account_id" value={account.account_id} />
              <input type="hidden" name="disabled" value={account.disabled ? "false" : "true"} />
              <Button type="submit" variant="soft" color={account.disabled ? "gray" : "red"} disabled={toggling}>
                {account.disabled ? "Enable" : "Disable"}
              </Button>
            </form>
          </Flex>
          <Status state={toggleState} />
          <Flex justify="between" align="center" gap="3" wrap="wrap">
            <Text size="2" color="gray">
              Deleting removes the account, its grants and its trusts.
            </Text>
            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button variant="solid" color="red">
                  Delete
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content style={{ maxWidth: 440 }}>
                <AlertDialog.Title>Delete {account.name}?</AlertDialog.Title>
                <AlertDialog.Description size="2">
                  Every grant it holds and every way it signs in go with it. Credentials
                  it already obtained keep working until they expire.
                </AlertDialog.Description>
                <Flex justify="end" gap="3" mt="4">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray" disabled={deleting}>
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <form action={deleteAction}>
                    <input type="hidden" name="account_id" value={account.account_id} />
                    {/* Not AlertDialog.Action: that closes the dialog on click,
                        before the action is dispatched. A deleted account
                        leaves for the list; a refused one stays to say why. */}
                    <Button type="submit" color="red" disabled={deleting} loading={deleting}>
                      Delete
                    </Button>
                  </form>
                </Flex>
                <Status state={deleteState} />
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>
        </Flex>
      </SectionHeader>
    </Flex>
  );
}
