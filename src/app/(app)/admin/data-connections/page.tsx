import { Metadata } from "next";
import { accountsTable } from "@/lib/clients";
import { getPageSession } from "@/lib/api/utils";
import { listAllDataConnections } from "@/lib/operations/data-connections";
import { Flex, Button, Heading } from "@radix-ui/themes";
import Link from "next/link";
import { DataConnectionsList } from "@/components/features/data-connections";
import {
  adminDataConnectionCreateUrl,
  adminDataConnectionEditUrl,
} from "@/lib/urls";

export const metadata: Metadata = {
  title: "Admin — Data connections",
};

export default async function DataConnectionsPage() {
  // The admin layout has already turned away everyone else, and an admin is
  // shown every connection.
  const result = await listAllDataConnections(await getPageSession(), {});
  const connections = result.ok ? result.value : [];

  const ownerIds = connections
    .map((conn) => conn.owner)
    .filter((id): id is string => Boolean(id));
  const ownerAccounts = Object.fromEntries(
    (await accountsTable.fetchManyByIds(ownerIds)).map((acct) => [
      acct.account_id,
      acct,
    ])
  );

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="4">Data Connections</Heading>
        <Button asChild size="2" highContrast>
          <Link href={adminDataConnectionCreateUrl()}>New Connection</Link>
        </Button>
      </Flex>

      <DataConnectionsList
        connections={connections}
        editHref={adminDataConnectionEditUrl}
        ownerAccounts={ownerAccounts}
      />
    </Flex>
  );
}
