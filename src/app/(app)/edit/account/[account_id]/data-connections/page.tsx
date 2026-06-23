import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Text, Table, Flex, Badge, Button, Heading } from "@radix-ui/themes";
import { Link1Icon } from "@radix-ui/react-icons";
import Link from "next/link";
import { DataProvider } from "@/types";
import { accountsTable, dataConnectionsTable } from "@/lib/clients";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccountDataConnections } from "@/lib/api/authz";
import {
  accountDataConnectionCreateUrl,
  accountDataConnectionEditUrl,
} from "@/lib/urls";

export const metadata: Metadata = {
  title: "Data connections",
};

const PROVIDER_BADGE: Record<
  DataProvider,
  { label: string; color: "orange" | "blue" | "green" }
> = {
  [DataProvider.S3]: { label: "S3", color: "orange" },
  [DataProvider.Azure]: { label: "Azure", color: "blue" },
  [DataProvider.GCP]: { label: "GCP", color: "green" },
};

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function AccountDataConnectionsPage({ params }: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  const account = await accountsTable.fetchById(account_id);
  if (!account || !canManageAccountDataConnections(session, account)) {
    notFound();
  }

  // ponytail: scan + filter by owner; add an owner GSI only if the connection
  // table actually grows. Mirrors the admin list, which also scans.
  const connections = (await dataConnectionsTable.listAll())
    .filter((conn) => conn.owner === account_id)
    .sort(
      (a, b) =>
        a.details.provider.localeCompare(b.details.provider) ||
        a.name.localeCompare(b.name)
    );

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="4">Data Connections</Heading>
        <Button asChild size="2">
          <Link href={accountDataConnectionCreateUrl(account_id)}>
            New Connection
          </Link>
        </Button>
      </Flex>

      {connections.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          gap="2"
          py="8"
          style={{ userSelect: "none" }}
        >
          <Link1Icon width="48" height="48" color="var(--gray-8)" />
          <Text size="4" weight="medium" color="gray">
            No data connections
          </Text>
          <Text size="2" color="gray">
            Create a data connection to get started.
          </Text>
        </Flex>
      ) : (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Region</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Read Only</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Visibilities</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {connections.map((conn) => (
              <Table.Row key={conn.data_connection_id}>
                <Table.Cell>
                  <Flex direction="column">
                    <Link
                      href={accountDataConnectionEditUrl(
                        account_id,
                        conn.data_connection_id
                      )}
                      style={{ color: "var(--accent-11)" }}
                    >
                      {conn.name}
                    </Link>
                    <Text
                      size="1"
                      color="gray"
                      style={{ fontFamily: "var(--code-font-family)" }}
                    >
                      {conn.data_connection_id}
                    </Text>
                  </Flex>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={PROVIDER_BADGE[conn.details.provider].color}>
                    {PROVIDER_BADGE[conn.details.provider].label}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">
                    {"region" in conn.details ? conn.details.region : "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={conn.read_only ? "red" : "green"}>
                    {conn.read_only ? "Yes" : "No"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Flex gap="1" wrap="wrap">
                    {conn.allowed_visibilities.length === 0 ? (
                      <Text size="2" color="gray">
                        -
                      </Text>
                    ) : (
                      conn.allowed_visibilities.map((visibility) => (
                        <Badge key={visibility} variant="soft" size="1">
                          {visibility}
                        </Badge>
                      ))
                    )}
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Flex>
  );
}
