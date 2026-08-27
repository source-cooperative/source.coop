import { Metadata } from "next";
import { Suspense } from "react";
import { Box, Flex, Text } from "@radix-ui/themes";
import { notFound } from "next/navigation";
import { accountsTable, dataConnectionsTable } from "@/lib/clients";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccountDataConnections } from "@/lib/api/authz";
import {
  DataConnectionForm,
  DeleteConnectionControl,
  DeleteConnectionNote,
} from "@/components/features/data-connections";
import { ConnectionUsage } from "@/components/features/data-connections/ConnectionUsage";
import { toEditableDataConnection } from "@/components/features/data-connections/redact";
import { FormTitle, DangerZone } from "@/components/core";

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
    <Box>
      <FormTitle
        title="Edit Data Connection"
        description="Update this connection's settings and credentials."
      />
      <DataConnectionForm
        mode="edit"
        ownerAccountId={account_id}
        dataConnection={toEditableDataConnection(dataConnection)}
      />

      <Box mt="6">
        <Suspense
          fallback={
            <Text size="2" color="gray">
              Loading product usage…
            </Text>
          }
        >
          <ConnectionUsage connectionId={dataConnection.data_connection_id} />
        </Suspense>
      </Box>

      {/* Below the usage list, which is what answers "can I delete this?" */}
      <DangerZone
        title="Delete this connection"
        description="Removes the connection record and its stored credentials. The bucket and its objects are not touched."
        action={
          <DeleteConnectionControl
            connectionId={dataConnection.data_connection_id}
          />
        }
        note={
          <DeleteConnectionNote
            connectionId={dataConnection.data_connection_id}
          />
        }
      />
    </Box>
  );
}
