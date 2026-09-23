"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import {
  AlertDialog,
  Badge,
  Button,
  Card,
  Code,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import { CubeIcon } from "@radix-ui/react-icons";
import {
  deleteServiceAccount,
  removeTrust,
  setServiceAccountDisabled,
} from "@/lib/actions/service-accounts";
import { editProductMembershipsUrl } from "@/lib/urls";
import {
  GITHUB_ACTIONS_ISSUER,
  IDLE_SERVICE_ACCOUNT_ACTION_STATE as IDLE,
  MembershipRole,
  type ServiceAccountSummary,
} from "@/types";
import { AddGithubTrustDialog } from "./AddGithubTrustDialog";

const issuerLabel = (issuer: string) =>
  issuer === GITHUB_ACTIONS_ISSUER ? "GitHub Actions" : issuer;

function ServiceAccountCard({ summary }: { summary: ServiceAccountSummary }) {
  const { account, trusts, grants } = summary;
  const [removeState, removeAction, removing] = useActionState(removeTrust, IDLE);
  const [toggleState, toggleAction, toggling] = useActionState(setServiceAccountDisabled, IDLE);
  const [, deleteAction, deleting] = useActionState(deleteServiceAccount, IDLE);
  const message = removeState.message || toggleState.message;

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Flex direction="column" gap="1">
            <Heading size="4">{account.name}</Heading>
            <Code size="2">@{account.account_id}</Code>
          </Flex>
          <Badge color={account.disabled ? "red" : "green"}>
            {account.disabled ? "Disabled" : "Active"}
          </Badge>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Signs in as
          </Text>
          {trusts.length === 0 && (
            <Text size="2" color="gray">
              Nothing yet — it cannot sign in until a workflow is trusted.
            </Text>
          )}
          {trusts.map((trust) => (
            <Flex key={`${trust.issuer} ${trust.subject}`} align="center" gap="3" wrap="wrap">
              <Badge variant="outline" color="gray">
                {issuerLabel(trust.issuer)}
              </Badge>
              <Code size="1">{trust.subject}</Code>
              <form action={removeAction}>
                <input type="hidden" name="account_id" value={account.account_id} />
                <input type="hidden" name="issuer" value={trust.issuer} />
                <input type="hidden" name="subject" value={trust.subject} />
                <Button type="submit" size="1" variant="ghost" color="red" disabled={removing}>
                  Remove
                </Button>
              </form>
            </Flex>
          ))}
          <Flex>
            <AddGithubTrustDialog accountId={account.account_id} />
          </Flex>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="2" weight="medium">
            Can reach
          </Text>
          {grants.length === 0 && (
            <Text size="2" color="gray">
              No products. Grant one from a product&apos;s memberships page.
            </Text>
          )}
          {grants.map((grant) => (
            <Flex key={grant.membership_id} align="center" gap="3">
              <Link href={editProductMembershipsUrl(account.owner_account_id, grant.repository_id ?? "")}>
                <Code size="1">{grant.repository_id}</Code>
              </Link>
              <Badge color={grant.role === MembershipRole.WriteData ? "green" : "gray"}>
                {grant.role === MembershipRole.WriteData ? "Read and write" : "Read"}
              </Badge>
            </Flex>
          ))}
        </Flex>

        <Flex justify="between" align="center" gap="3" wrap="wrap">
          <form action={toggleAction}>
            <input type="hidden" name="account_id" value={account.account_id} />
            <input type="hidden" name="disabled" value={account.disabled ? "false" : "true"} />
            <Button type="submit" size="1" variant="soft" color="gray" disabled={toggling}>
              {account.disabled ? "Enable" : "Disable"}
            </Button>
          </form>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button size="1" variant="soft" color="red" disabled={deleting}>
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
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <form action={deleteAction}>
                  <input type="hidden" name="account_id" value={account.account_id} />
                  <AlertDialog.Action>
                    <Button type="submit" color="red">
                      Delete
                    </Button>
                  </AlertDialog.Action>
                </form>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
        {message && (
          <Text size="1" color={removeState.success || toggleState.success ? "green" : "red"}>
            {message}
          </Text>
        )}
      </Flex>
    </Card>
  );
}

/**
 * An owner's service accounts: who each one is, how it signs in, what it can
 * reach, and the controls to change that.
 */
export function ServiceAccountList({ summaries }: { summaries: ServiceAccountSummary[] }) {
  if (summaries.length === 0) {
    return (
      <Flex direction="column" align="center" gap="2" py="8" style={{ userSelect: "none" }}>
        <CubeIcon width="48" height="48" color="var(--gray-8)" />
        <Text size="4" weight="medium" color="gray">
          No service accounts yet
        </Text>
        <Text size="2" color="gray">
          Create one for a nightly sync, a publishing pipeline, or an instrument.
        </Text>
      </Flex>
    );
  }
  return (
    <Flex direction="column" gap="4">
      {summaries.map((summary) => (
        <ServiceAccountCard key={summary.account.account_id} summary={summary} />
      ))}
    </Flex>
  );
}
