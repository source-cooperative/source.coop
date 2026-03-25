import { dataConnectionsTable } from "@/lib/clients";
import { Text, Table, Flex, Badge, Button, Heading } from "@radix-ui/themes";
import { Link1Icon } from "@radix-ui/react-icons";
import Link from "next/link";
import {
  adminDataConnectionCreateUrl,
  adminDataConnectionEditUrl,
} from "@/lib/urls";

export default async function DataConnectionsPage() {
  const connections = await dataConnectionsTable.listAll();

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="4">Data Connections</Heading>
        <Button asChild size="2">
          <Link href={adminDataConnectionCreateUrl()}>New Connection</Link>
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
              <Table.ColumnHeaderCell>ID</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Region</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Read Only</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Data Modes</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {connections.map((conn) => (
              <Table.Row key={conn.data_connection_id}>
                <Table.Cell>
                  <Link
                    href={adminDataConnectionEditUrl(conn.data_connection_id)}
                    style={{ color: "var(--accent-11)" }}
                  >
                    {conn.name}
                  </Link>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" style={{ fontFamily: "var(--code-font-family)" }}>
                    {conn.data_connection_id}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={conn.details.provider === "s3" ? "orange" : "blue"}>
                    {conn.details.provider === "s3" ? "S3" : "Azure"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{conn.details.region}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={conn.read_only ? "red" : "green"}>
                    {conn.read_only ? "Yes" : "No"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Flex gap="1" wrap="wrap">
                    {conn.allowed_data_modes.map((mode) => (
                      <Badge key={mode} variant="soft" size="1">
                        {mode}
                      </Badge>
                    ))}
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
