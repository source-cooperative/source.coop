import { Metadata } from "next";
import { dataConnectionsTable } from "@/lib/clients";
import { Flex, Button, Heading } from "@radix-ui/themes";
import Link from "next/link";
import { DataConnectionsTable } from "@/components/features/data-connections";
import {
  adminDataConnectionCreateUrl,
  adminDataConnectionEditUrl,
} from "@/lib/urls";

export const metadata: Metadata = {
  title: "Admin — Data connections",
};

export default async function DataConnectionsPage() {
  const connections = (await dataConnectionsTable.listAll()).sort(
    (a, b) =>
      a.details.provider.localeCompare(b.details.provider) ||
      a.name.localeCompare(b.name)
  );

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="4">Data Connections</Heading>
        <Button asChild size="2">
          <Link href={adminDataConnectionCreateUrl()}>New Connection</Link>
        </Button>
      </Flex>

      <DataConnectionsTable
        connections={connections}
        editHref={adminDataConnectionEditUrl}
      />
    </Flex>
  );
}
