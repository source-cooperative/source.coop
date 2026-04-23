import { Flex, Heading } from "@radix-ui/themes";
import { dataConnectionsTable } from "@/lib/clients";
import { notFound } from "next/navigation";
import { DataConnectionForm } from "@/components/features/data-connections";
import { DeleteDataConnectionButton } from "@/components/features/data-connections";

interface EditDataConnectionPageProps {
  params: Promise<{ data_connection_id: string }>;
}

export default async function EditDataConnectionPage({
  params,
}: EditDataConnectionPageProps) {
  const { data_connection_id } = await params;
  const dataConnection = await dataConnectionsTable.fetchById(data_connection_id);

  if (!dataConnection) {
    notFound();
  }

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="4">Edit Data Connection</Heading>
        <DeleteDataConnectionButton
          dataConnectionId={dataConnection.data_connection_id}
        />
      </Flex>
      <DataConnectionForm mode="edit" dataConnection={dataConnection} />
    </Flex>
  );
}
