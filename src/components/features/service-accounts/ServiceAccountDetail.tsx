"use client";

import React from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Code,
  DataList,
  Flex,
  Heading,
  Separator,
  Table,
  Text,
} from "@radix-ui/themes";
import {
  InfoCircledIcon,
  Pencil1Icon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { CodeBlock } from "./CodeBlock";
import { ROLES, type Plan, type ServiceAccountFormValues } from "./plan";

/**
 * Mock detail view for a created service account. Stands in for the page a
 * real create would redirect to, and carries the one-time key so the
 * "shown once" moment is reviewable.
 */
export function ServiceAccountDetail({
  plan,
  values,
  issuedKey,
  onEdit,
}: {
  plan: Plan;
  values: ServiceAccountFormValues;
  issuedKey: string | null;
  onEdit: () => void;
}) {
  return (
    <Flex direction="column" gap="5">
      <Callout.Root color="amber">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <strong>Design mock.</strong> Nothing was saved. This stands in for
          the page you&rsquo;d land on after creating a service account, so the
          data model in #491 can be reviewed before it&rsquo;s built.
        </Callout.Text>
      </Callout.Root>

      <Flex justify="between" align="start" gap="3" wrap="wrap">
        <Box>
          <Heading size="6">{values.name}</Heading>
          <Flex align="center" gap="2" mt="1">
            <Code>{plan.serviceAccountId}</Code>
            <CopyToClipboard text={plan.serviceAccountId} />
            <Badge color="green">Active</Badge>
          </Flex>
        </Box>
        <Button variant="soft" onClick={onEdit}>
          <Pencil1Icon /> Edit
        </Button>
      </Flex>

      {issuedKey && (
        <Callout.Root color="grass">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Copy your API key now — this is the only time it is shown.
              </Text>
              <Flex align="center" gap="2" wrap="wrap">
                <Code size="2" style={{ wordBreak: "break-all" }}>
                  {issuedKey}
                </Code>
                <CopyToClipboard text={issuedKey} />
              </Flex>
              <Text size="1" color="gray">
                Source stores only a hash of this key. If you lose it, issue a
                new one and revoke this one — it cannot be recovered.
              </Text>
            </Flex>
          </Callout.Text>
        </Callout.Root>
      )}

      <Card>
        <Heading size="3" mb="3">
          Summary
        </Heading>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label minWidth="140px">Owner</DataList.Label>
            <DataList.Value>
              <Code>{values.ownerAccountId}</Code>
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label minWidth="140px">Signs in via</DataList.Label>
            <DataList.Value>
              <Flex direction="column" gap="1">
                {values.signInMethods.map((method, index) =>
                  method.kind === "github" ? (
                    <Text size="2" key={index}>
                      GitHub — <Code>{method.repository}</Code> @{" "}
                      <Code>{method.ref}</Code>
                    </Text>
                  ) : (
                    <Text size="2" key={index}>
                      API key —{" "}
                      {method.expiresInDays === null
                        ? "no expiry"
                        : `expires in ${method.expiresInDays} days`}
                    </Text>
                  )
                )}
              </Flex>
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label minWidth="140px">Can reach</DataList.Label>
            <DataList.Value>
              {values.accessScope === "all" ? (
                <Text size="2">
                  Every product under <Code>{values.ownerAccountId}</Code> —{" "}
                  {values.allPermission === "write" ? "read and write" : "read"}
                </Text>
              ) : (
                <Flex direction="column" gap="1">
                  {values.productGrants.map((grant) => (
                    <Text size="2" key={grant.product_id}>
                      <Code>{grant.product_id}</Code> —{" "}
                      {grant.permission === "write" ? "read and write" : "read"}
                    </Text>
                  ))}
                </Flex>
              )}
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label minWidth="140px">Roles it may use</DataList.Label>
            <DataList.Value>
              <Flex gap="2" wrap="wrap">
                {values.allowedRoles.map((role) => (
                  <Badge key={role} color="blue">
                    {ROLES[role].label}
                  </Badge>
                ))}
              </Flex>
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label minWidth="140px">Last authenticated</DataList.Label>
            <DataList.Value>
              <Text size="2" color="gray">
                Never
              </Text>
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Card>

      <Card>
        <Heading size="3" mb="1">
          How to use it
        </Heading>
        <Text size="2" color="gray">
          One block per sign-in method.
        </Text>
        <Flex direction="column" gap="4" mt="3">
          {plan.workloadConfig.map((block) => (
            <CodeBlock
              key={block.title}
              title={block.title}
              language={block.language}
              lines={block.lines}
            />
          ))}
        </Flex>
      </Card>

      <Separator size="4" />

      <Box>
        <Heading size="5" mb="1">
          What this would have written
        </Heading>
        <Text size="2" color="gray">
          The point of the mock: the rows behind the screen above.
        </Text>

        <Flex direction="column" gap="4" mt="4">
          {plan.tables.map((table) => (
            <Card key={table.table}>
              <Flex align="center" gap="2" mb="1" wrap="wrap">
                <Heading size="3">
                  <Code>{table.table}</Code>
                </Heading>
                <Badge color={table.status === "new table" ? "orange" : "gray"}>
                  {table.status}
                </Badge>
                <Text size="1" color="gray">
                  {table.purpose}
                </Text>
              </Flex>

              {table.rows.length === 0 ? (
                <Text size="2" color="gray">
                  No rows.
                </Text>
              ) : (
                <Flex direction="column" gap="3" mt="2">
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
              )}
            </Card>
          ))}

          <Callout.Root color="gray">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <Flex direction="column" gap="1">
                {plan.caveats.map((caveat) => (
                  <span key={caveat}>{caveat}</span>
                ))}
              </Flex>
            </Callout.Text>
          </Callout.Root>
        </Flex>
      </Box>
    </Flex>
  );
}
