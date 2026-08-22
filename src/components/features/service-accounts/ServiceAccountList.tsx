"use client";

import React, { useState } from "react";
import NextLink from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Dialog,
  DropdownMenu,
  Flex,
  Grid,
  Heading,
  Separator,
  Table,
  Text,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { CodeBlock } from "./CodeBlock";
import { MockDisclosure } from "./MockDisclosure";
import {
  ROLES,
  planDelete,
  planDisable,
  type LifecyclePlan,
  type Plan,
} from "./plan";
import type { MockServiceAccount } from "./fixtures";

/**
 * Each card arrives with its `editHref` and its planned rows resolved on the
 * server. A function prop cannot cross the server/client boundary, so the
 * caller cannot pass builders.
 */
export type ServiceAccountRow = MockServiceAccount & {
  editHref: string;
  plan: Plan;
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray">
        {label}
      </Text>
      {children}
    </Flex>
  );
}

function signInLines(entry: ServiceAccountRow): React.ReactNode[] {
  return entry.values.signInMethods.map((method, index) =>
    method.kind === "github" ? (
      <Text size="2" key={index}>
        GitHub — <Code size="1">{method.repository}</Code> @{" "}
        <Code size="1">{method.ref}</Code>
      </Text>
    ) : (
      <Text size="2" key={index}>
        API key —{" "}
        {method.expiresInDays === null
          ? "no expiry"
          : `expires in ${method.expiresInDays} days`}
      </Text>
    )
  );
}

function accessLines(entry: ServiceAccountRow): React.ReactNode[] {
  const { accessScope, allPermission, productGrants, ownerAccountId } =
    entry.values;

  if (accessScope === "all") {
    return [
      <Text size="2" key="all">
        Every product under <Code size="1">{ownerAccountId}</Code> —{" "}
        {allPermission === "write" ? "read and write" : "read"}
      </Text>,
    ];
  }
  if (productGrants.length === 0) {
    return [
      <Text size="2" color="gray" key="none">
        No products
      </Text>,
    ];
  }
  return productGrants.map((grant) => (
    <Text size="2" key={grant.product_id}>
      <Code size="1">{grant.product_id}</Code> —{" "}
      {grant.permission === "write" ? "read and write" : "read"}
    </Text>
  ));
}

type Pending = "disable" | "enable" | "delete";

/** Edit, disable/enable and delete for one card. Changes nothing. */
function CardActions({
  entry,
  onResult,
  onShowMock,
}: {
  entry: ServiceAccountRow;
  onResult: (result: { action: Pending; plan: LifecyclePlan } | null) => void;
  onShowMock: () => void;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const toggle: Pending = entry.disabled ? "enable" : "disable";

  function confirm(action: Pending) {
    onResult({
      action,
      plan:
        action === "delete"
          ? planDelete(entry.values)
          : planDisable(entry.values, action === "disable"),
    });
    setPending(null);
  }

  if (pending) {
    return (
      <Flex gap="2" align="center" wrap="wrap">
        <Text size="1" color={pending === "delete" ? "red" : "gray"}>
          {pending === "delete"
            ? `Delete ${entry.values.name}?`
            : `${pending === "enable" ? "Enable" : "Disable"} ${entry.values.name}?`}
        </Text>
        <Button
          size="1"
          color={pending === "delete" ? "red" : "amber"}
          onClick={() => confirm(pending)}
        >
          Confirm
        </Button>
        <Button
          size="1"
          variant="soft"
          color="gray"
          onClick={() => {
            setPending(null);
            onResult(null);
          }}
        >
          Cancel
        </Button>
      </Flex>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button size="2" variant="soft">
          Manage
          <DropdownMenu.TriggerIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item asChild>
          <NextLink href={entry.editHref}>Edit</NextLink>
        </DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => setPending(toggle)}>
          {entry.disabled ? "Enable" : "Disable"}
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item color="red" onSelect={() => setPending("delete")}>
          Delete
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onSelect={onShowMock}>Mock Details</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

function PlannedRows({ plan }: { plan: Plan }) {
  return (
    <Flex direction="column" gap="4">
      {plan.tables.map((table) => (
        <Box key={table.table}>
          <Flex align="center" gap="2" mb="2" wrap="wrap">
            <Text size="2" weight="medium">
              <Code>{table.table}</Code>
            </Text>
            <Badge color={table.status === "new table" ? "orange" : "gray"}>
              {table.status}
            </Badge>
            <Text size="1" color="gray">
              {table.purpose}
            </Text>
          </Flex>
          <Flex direction="column" gap="3">
            {table.rows.map((row, index) => (
              <Box key={index}>
                <Table.Root size="1" variant="surface">
                  <Table.Body>
                    {Object.entries(row.fields).map(([key, value]) => (
                      <Table.Row key={key}>
                        <Table.RowHeaderCell
                          style={{ width: "40%", whiteSpace: "nowrap" }}
                        >
                          <Text size="1" color="gray">
                            {key}
                          </Text>
                        </Table.RowHeaderCell>
                        <Table.Cell>
                          <Code size="1">{value}</Code>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
                {row.note && (
                  <Text size="1" color="gray" as="p" mt="1">
                    {row.note}
                  </Text>
                )}
              </Box>
            ))}
          </Flex>
        </Box>
      ))}
      <Flex direction="column" gap="1">
        {plan.caveats.map((caveat) => (
          <Text size="1" color="gray" key={caveat}>
            {caveat}
          </Text>
        ))}
      </Flex>
    </Flex>
  );
}

function ServiceAccountCard({ entry }: { entry: ServiceAccountRow }) {
  const [result, setResult] = useState<{
    action: Pending;
    plan: LifecyclePlan;
  } | null>(null);
  const [showMock, setShowMock] = useState(false);

  return (
    <Card>
      <Flex direction="column" gap="4">
        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Flex align="center" gap="2" wrap="wrap">
            <Heading size="4">{entry.values.name}</Heading>
            <Badge color={entry.disabled ? "gray" : "green"}>
              {entry.disabled ? "Disabled" : "Active"}
            </Badge>
          </Flex>
          <CardActions
            entry={entry}
            onResult={setResult}
            onShowMock={() => setShowMock(true)}
          />
        </Flex>

        {result && (
          <MockDisclosure
            summary={`Design mock — nothing was ${
              result.action === "delete" ? "deleted" : "changed"
            }. Show what ${
              result.action === "delete" ? "deleting" : `${result.action}ing`
            } would do.`}
          >
            <Flex direction="column" gap="3">
              <Flex direction="column" gap="1">
                {result.plan.changes.map((change) => (
                  <Text size="2" key={`${change.table}-${change.detail}`}>
                    <Badge
                      color={change.operation === "delete" ? "red" : "amber"}
                      variant="soft"
                    >
                      {change.operation}
                    </Badge>{" "}
                    <Code size="1">{change.table}</Code> — {change.detail}
                  </Text>
                ))}
              </Flex>
              <Flex direction="column" gap="1">
                {result.plan.effects.map((effect) => (
                  <Text size="1" color="gray" key={effect}>
                    {effect}
                  </Text>
                ))}
              </Flex>
            </Flex>
          </MockDisclosure>
        )}

        <Grid columns={{ initial: "1", sm: "3" }} gap="4">
          <Fact label="Signs in via">
            <Flex direction="column" gap="1">
              {signInLines(entry)}
            </Flex>
          </Fact>
          <Fact label="Can reach">
            <Flex direction="column" gap="1">
              {accessLines(entry)}
            </Flex>
          </Fact>
          <Fact label="Roles it may use">
            <Flex gap="1" wrap="wrap">
              {entry.values.allowedRoles.map((role) => (
                <Badge
                  key={role}
                  color={role === "read_only" ? "blue" : "iris"}
                  variant="soft"
                >
                  {ROLES[role].label}
                </Badge>
              ))}
            </Flex>
          </Fact>
        </Grid>

        <Separator size="4" />

        <Box asChild>
          <details>
            <summary style={{ cursor: "pointer", listStyle: "revert" }}>
              <Text size="2" weight="medium">
                How to use this
              </Text>
            </summary>
            <Flex direction="column" gap="4" mt="3">
              {entry.plan.workloadConfig.map((block) => (
                <CodeBlock
                  key={block.title}
                  title={block.title}
                  language={block.language}
                  lines={block.lines}
                />
              ))}
            </Flex>
          </details>
        </Box>

        <Flex gap="4" wrap="wrap">
          <Text size="1" color="gray">
            Last authenticated {entry.lastAuthenticated ?? "never"}
          </Text>
          <Text size="1" color="gray">
            Created {entry.createdAt}
          </Text>
        </Flex>
      </Flex>

      <Dialog.Root open={showMock} onOpenChange={setShowMock}>
        <Dialog.Content
          maxWidth="760px"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          <Dialog.Title>{entry.values.name}</Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="4">
            Design mock — nothing is stored. These are the rows this service
            account would be made of.
          </Dialog.Description>

          <PlannedRows plan={entry.plan} />

          <Flex justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft">Close</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Card>
  );
}

export function ServiceAccountList({
  accounts,
  createHref,
}: {
  accounts: ServiceAccountRow[];
  createHref: string;
}) {
  return (
    <Flex direction="column" gap="4">
      <MockDisclosure summary="Design mock — these service accounts are fabricated. What is this?">
        <Text size="2" as="p">
          Nothing here is stored. The accounts below are invented so the flow
          proposed in <Code>#491</Code> can be clicked through — expand a card,
          or create a new one, to see the database rows the real thing would
          write.
        </Text>
      </MockDisclosure>

      <Flex justify="end">
        <Button asChild>
          <NextLink href={createHref}>
            <PlusIcon /> New Service Account
          </NextLink>
        </Button>
      </Flex>

      {accounts.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" align="center" p="5">
            <Text size="3" weight="medium">
              No service accounts yet
            </Text>
            <Text size="2" color="gray" align="center">
              Create one to let software read or write this account&rsquo;s
              products without borrowing anyone&rsquo;s login.
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {accounts.map((entry) => (
            <ServiceAccountCard key={entry.values.name} entry={entry} />
          ))}
        </Flex>
      )}
    </Flex>
  );
}
