"use client";

import Link from "next/link";
import { Button, Callout, Card, Code, Flex, Heading, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { editAccountServiceAccountsUrl } from "@/lib/urls";
import type { ServiceAccountFormState } from "@/types";
import { WorkflowSnippet } from "./WorkflowSnippet";

/**
 * What the form shows once the account exists. The account, its grants and
 * the workflows it trusts are all saved; what remains is pasting each
 * workflow's step, which is shown here and can be shown again from the list.
 */
export function ServiceAccountCreated({
  created,
  ownerAccountId,
}: {
  created: NonNullable<ServiceAccountFormState["created"]>;
  ownerAccountId: string;
}) {
  return (
    <Flex direction="column" gap="4">
      <Heading size="5">
        {created.name} <Code>@{created.account_id}</Code> is ready
      </Heading>
      {created.trusts.length > 0 ? (
        <Card>
          <Flex direction="column" gap="4">
            <Text size="2" color="gray">
              Each trusted workflow acts as the account by adding the step below.
            </Text>
            {created.trusts.map((trust) => (
              <WorkflowSnippet key={trust.subject} subject={trust.subject} step={trust.workflow_step} />
            ))}
          </Flex>
        </Card>
      ) : (
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            No way to sign in yet. Trust a GitHub workflow from the service
            accounts list when you are ready.
          </Callout.Text>
        </Callout.Root>
      )}
      <Flex>
        <Button asChild variant="soft">
          <Link href={editAccountServiceAccountsUrl(ownerAccountId)}>Back to service accounts</Link>
        </Button>
      </Flex>
    </Flex>
  );
}
