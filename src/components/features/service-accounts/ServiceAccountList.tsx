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
  Link,
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

/** Small caps label in the app's code face — used for anything a machine reads. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="1"
      color="gray"
      style={{
        fontFamily: "var(--code-font-family)",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </Text>
  );
}

function Mono({
  children,
  color,
  size = "2",
}: {
  children: React.ReactNode;
  color?: "gray";
  size?: "1" | "2";
}) {
  return (
    <Text size={size} color={color} style={{ fontFamily: "var(--code-font-family)" }}>
      {children}
    </Text>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Flex direction="column" gap="2">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </Flex>
  );
}

/** Square status mark — a filled dot plus a small-caps word. Radix's soft
 * Badge reads as a rounded pill, which fights the theme's `radius: none`. */
function StatusMark({ disabled }: { disabled?: boolean }) {
  return (
    <Flex align="center" gap="2">
      <Box
        style={{
          width: 6,
          height: 6,
          background: disabled ? "var(--gray-8)" : "var(--green-9)",
        }}
      />
      <Text
        size="1"
        style={{
          fontFamily: "var(--code-font-family)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: disabled ? "var(--gray-11)" : "var(--green-11)",
        }}
      >
        {disabled ? "Disabled" : "Active"}
      </Text>
    </Flex>
  );
}

function ServiceAccountIcon({ disabled }: { disabled?: boolean }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      stroke={disabled ? "var(--gray-9)" : "var(--gray-12)"}
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M10 2.5l6.5 3.5v8L10 17.5 3.5 14V6z" />
      <path d="M3.5 6l6.5 3.5L16.5 6" />
      <path d="M10 9.5v8" />
    </svg>
  );
}

/** Link-styled trigger for an in-page action. */
function LinkButton({
  children,
  onClick,
  muted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <Link asChild size="2" color="gray" highContrast={!muted}>
      <button
        type="button"
        onClick={onClick}
        style={{
          background: "none",
          border: 0,
          padding: 0,
          font: "inherit",
          cursor: "var(--cursor-link)",
        }}
      >
        {children}
      </button>
    </Link>
  );
}

function signInLines(entry: ServiceAccountRow): React.ReactNode[] {
  const muted = entry.disabled ? "gray" : undefined;
  return entry.values.signInMethods.map((method, index) =>
    method.kind === "github" ? (
      <Flex direction="column" key={index}>
        <Text size="2" color={muted}>
          GitHub
        </Text>
        <Mono size="1" color="gray">
          {method.repository}
        </Mono>
        <Mono size="1" color="gray">
          {method.ref}
        </Mono>
      </Flex>
    ) : (
      <Text size="2" color={muted} key={index}>
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
  const muted = entry.disabled ? "gray" : undefined;
  const permission = (value: "read" | "write") =>
    value === "write" ? "read and write" : "read";

  if (accessScope === "all") {
    return [
      <Flex align="baseline" gap="2" key="all" wrap="wrap">
        <Text size="2" color={muted}>
          Every product under
        </Text>
        <Mono size="1" color="gray">
          {ownerAccountId}
        </Mono>
        <Text size="2" color="gray">
          {permission(allPermission)}
        </Text>
      </Flex>,
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
    <Flex align="baseline" gap="2" key={grant.product_id} wrap="wrap">
      <Mono size="2" color={muted}>
        {grant.product_id}
      </Mono>
      <Text size="2" color="gray">
        {permission(grant.permission)}
      </Text>
    </Flex>
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
  const [showUsage, setShowUsage] = useState(false);

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {/* Identity band. Tinted so the name and its controls read as a unit
          before the eye reaches the facts below. */}
      <Flex
        justify="between"
        align="center"
        gap="3"
        wrap="wrap"
        px="4"
        py="3"
        style={{
          background: "var(--gray-2)",
          borderBottom: "1px solid var(--gray-5)",
        }}
      >
        <Flex align="center" gap="3">
          <ServiceAccountIcon disabled={entry.disabled} />
          <Heading size="4" color={entry.disabled ? "gray" : undefined}>
            {entry.values.name}
          </Heading>
          <Box
            style={{ width: 1, height: 15, background: "var(--gray-6)" }}
          />
          <StatusMark disabled={entry.disabled} />
        </Flex>

        <Flex align="center" gap="4">
          <LinkButton onClick={() => setShowUsage(true)} muted={entry.disabled}>
            Usage example
          </LinkButton>
          <CardActions
            entry={entry}
            onResult={setResult}
            onShowMock={() => setShowMock(true)}
          />
        </Flex>
      </Flex>

      <Grid columns={{ initial: "1", sm: "3" }} gap="5" px="4" py="5">
        <Fact label="Signs in via">
          <Flex direction="column" gap="2">
            {signInLines(entry)}
          </Flex>
        </Fact>
        <Fact label="Can reach">
          <Flex direction="column" gap="1">
            {accessLines(entry)}
          </Flex>
        </Fact>
        <Fact label="Roles it may use">
          <Flex gap="2" wrap="wrap">
            {entry.values.allowedRoles.map((role) => (
              <Badge
                key={role}
                variant="outline"
                color="gray"
                highContrast={role === "full_access" && !entry.disabled}
                style={{ fontFamily: "var(--code-font-family)" }}
              >
                {ROLES[role].label.toLowerCase()}
              </Badge>
            ))}
          </Flex>
        </Fact>
      </Grid>

      {result && (
        <Box px="4" pb="4">
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
        </Box>
      )}

      <Flex
        gap="4"
        wrap="wrap"
        px="4"
        py="2"
        style={{ borderTop: "1px solid var(--gray-4)" }}
      >
        <Mono size="1" color="gray">
          last used {entry.lastAuthenticated ?? "never"}
        </Mono>
        <Mono size="1" color="gray">
          created {entry.createdAt}
        </Mono>
      </Flex>

      <Dialog.Root open={showUsage} onOpenChange={setShowUsage}>
        <Dialog.Content
          maxWidth="760px"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          <Dialog.Title>Using {entry.values.name}</Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="4">
            One block per sign-in method.
          </Dialog.Description>

          <Flex direction="column" gap="4">
            {entry.plan.workloadConfig.map((block) => (
              <CodeBlock
                key={block.title}
                title={block.title}
                language={block.language}
                lines={block.lines}
              />
            ))}
          </Flex>

          <Flex justify="end" mt="4">
            <Dialog.Close>
              <Button variant="soft">Close</Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

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
