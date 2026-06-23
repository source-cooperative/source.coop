import { Metadata } from "next";
import { Suspense } from "react";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import { notFound } from "next/navigation";
import {
  accountsTable,
  dataConnectionsTable,
  productsTable,
} from "@/lib/clients";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccountDataConnections } from "@/lib/api/authz";
import {
  DataConnectionForm,
  DeleteDataConnectionButton,
} from "@/components/features/data-connections";
import { ConnectionUsage } from "@/components/features/data-connections/ConnectionUsage";
import { toEditableDataConnection } from "@/components/features/data-connections/redact";

export const metadata: Metadata = {
  title: "Edit data connection",
};

interface PageProps {
  params: Promise<{ account_id: string; data_connection_id: string }>;
}

export default async function AccountEditDataConnectionPage({
  params,
}: PageProps) {
  const { account_id, data_connection_id } = await params;
  const session = await getPageSession();
  const account = await accountsTable.fetchById(account_id);
  if (!account || !canManageAccountDataConnections(session, account)) {
    notFound();
  }

  const dataConnection =
    await dataConnectionsTable.fetchById(data_connection_id);
  // Isolation: an account may only edit connections it owns. Hiding others as
  // 404 also avoids leaking that the connection exists.
  if (!dataConnection || dataConnection.owner !== account_id) {
    notFound();
  }

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="4">Edit Data Connection</Heading>
        <Suspense
          fallback={
            <Button size="2" color="red" variant="soft" disabled>
              Delete
            </Button>
          }
        >
          <DeleteConnectionControl
            connectionId={dataConnection.data_connection_id}
          />
        </Suspense>
      </Flex>
      <DataConnectionForm
        mode="edit"
        ownerAccountId={account_id}
        dataConnection={toEditableDataConnection(dataConnection)}
      />

      <Suspense
        fallback={
          <Text size="2" color="gray">
            Loading product usage…
          </Text>
        }
      >
        <ConnectionUsage connectionId={dataConnection.data_connection_id} />
      </Suspense>
    </Flex>
  );
}

// Mirrors the admin page: fetch the dependent-product count so delete can be
// disabled when the connection is in use. Request-deduped with <ConnectionUsage>.
async function DeleteConnectionControl({
  connectionId,
}: {
  connectionId: string;
}) {
  const products = await productsTable.listProductsByConnectionId(connectionId);
  return (
    <DeleteDataConnectionButton
      dataConnectionId={connectionId}
      productsInUse={products.length}
    />
  );
}
