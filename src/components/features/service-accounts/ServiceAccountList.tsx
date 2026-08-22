"use client";

import NextLink from "next/link";
import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Flex,
  Grid,
  Heading,
  Text,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { ROLES, serviceAccountId } from "./plan";
import { MockDisclosure } from "./MockDisclosure";
import type { MockServiceAccount } from "./fixtures";

/**
 * Each row arrives with its own `href`, resolved on the server. A function prop
 * cannot cross the server/client boundary, so the caller cannot pass a URL
 * builder.
 */
export type ServiceAccountRow = MockServiceAccount & { href: string };

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
          proposed in <Code>#491</Code> can be clicked through — open one, or
          create a new one, to see the database rows the real thing would
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
            <Card key={entry.values.name}>
              <Flex direction="column" gap="4">
                <Flex justify="between" align="start" gap="3" wrap="wrap">
                  <Box>
                    <Flex align="center" gap="2" wrap="wrap">
                      <Heading size="4">
                        <NextLink href={entry.href}>{entry.values.name}</NextLink>
                      </Heading>
                      <Badge color={entry.disabled ? "gray" : "green"}>
                        {entry.disabled ? "Disabled" : "Active"}
                      </Badge>
                    </Flex>
                    <Code size="1" color="gray">
                      {serviceAccountId(entry.values.name)}
                    </Code>
                  </Box>

                  <Button variant="soft" size="2" asChild>
                    <NextLink href={entry.href}>Manage</NextLink>
                  </Button>
                </Flex>

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

                <Flex gap="4" wrap="wrap">
                  <Text size="1" color="gray">
                    Last authenticated {entry.lastAuthenticated ?? "never"}
                  </Text>
                  <Text size="1" color="gray">
                    Created {entry.createdAt}
                  </Text>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Flex>
  );
}
