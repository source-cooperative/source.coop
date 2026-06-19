import { Metadata } from "next";
import { Suspense } from "react";
import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import { notFound } from "next/navigation";
import { dataConnectionsTable, productsTable } from "@/lib/clients";
import {
  DataConnectionForm,
  DeleteDataConnectionButton,
} from "@/components/features/data-connections";
import { ConnectionUsage } from "@/components/features/data-connections/ConnectionUsage";
import { toEditableDataConnection } from "@/components/features/data-connections/redact";

export const metadata: Metadata = {
  title: "Admin — Edit data connection",
};

interface EditDataConnectionPageProps {
  params: Promise<{ data_connection_id: string }>;
}

export default async function EditDataConnectionPage({
  params,
}: EditDataConnectionPageProps) {
  const { data_connection_id } = await params;
  const dataConnection = await dataConnectionsTable.fetchById(
    data_connection_id
  );

  if (!dataConnection) {
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

// Fetches the dependent-product count so the delete confirm can be disabled when
// the connection is in use. The scan is request-deduped with <ConnectionUsage>,
// so this adds no extra DB work; Suspense keeps it off the form's critical path.
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
