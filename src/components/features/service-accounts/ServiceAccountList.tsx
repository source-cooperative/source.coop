"use client";

import NextLink from "next/link";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Code,
  Flex,
  Table,
  Text,
} from "@radix-ui/themes";
import { InfoCircledIcon, PlusIcon } from "@radix-ui/react-icons";
import { ROLES, serviceAccountId } from "./plan";
import type { MockServiceAccount } from "./fixtures";

function describeSignIn(entry: MockServiceAccount): string[] {
  return entry.values.signInMethods.map((method) =>
    method.kind === "github" ? "GitHub" : "API key"
  );
}

function describeAccess(entry: MockServiceAccount): string {
  const { accessScope, allPermission, productGrants } = entry.values;
  if (accessScope === "all") {
    return `All products · ${allPermission === "write" ? "read & write" : "read"}`;
  }
  if (productGrants.length === 0) return "No products";
  if (productGrants.length === 1) {
    const [grant] = productGrants;
    return `${grant.product_id} · ${grant.permission === "write" ? "read & write" : "read"}`;
  }
  return `${productGrants.length} products`;
}

export function ServiceAccountList({
  accounts,
  createHref,
  detailHref,
}: {
  accounts: MockServiceAccount[];
  createHref: string;
  detailHref: (name: string) => string;
}) {
  return (
    <Flex direction="column" gap="4">
      <Callout.Root color="amber">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <strong>Design mock.</strong> These service accounts are fabricated
          and nothing is stored. This exists so the flow and data model proposed
          in #491 can be reviewed before they are built.
        </Callout.Text>
      </Callout.Root>

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
        <Box style={{ overflowX: "auto" }}>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Signs in via</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Access</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Roles</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>
                  Last authenticated
                </Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {accounts.map((entry) => (
                <Table.Row key={entry.values.name}>
                  <Table.RowHeaderCell>
                    <Flex direction="column" gap="1">
                      <NextLink href={detailHref(entry.values.name)}>
                        <Text size="2" weight="medium">
                          {entry.values.name}
                        </Text>
                      </NextLink>
                      <Code size="1" color="gray">
                        {serviceAccountId(entry.values.name)}
                      </Code>
                      {entry.disabled && (
                        <Box>
                          <Badge color="gray">Disabled</Badge>
                        </Box>
                      )}
                    </Flex>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    <Flex gap="1" wrap="wrap">
                      {describeSignIn(entry).map((label, index) => (
                        <Badge key={index} color="gray" variant="soft">
                          {label}
                        </Badge>
                      ))}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2">{describeAccess(entry)}</Text>
                  </Table.Cell>
                  <Table.Cell>
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
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {entry.lastAuthenticated ?? "Never"}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Flex>
  );
}
