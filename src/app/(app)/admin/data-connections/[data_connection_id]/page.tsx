import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { dataConnectionsTable } from "@/lib/clients";
import {
  DataConnectionForm,
  DeleteConnectionControl,
  DeleteConnectionNote,
} from "@/components/features/data-connections";
import { ConnectionUsage } from "@/components/features/data-connections/ConnectionUsage";
import { toEditableDataConnection } from "@/components/features/data-connections/redact";
import { DangerZone } from "@/components/core";
import { adminDataConnectionsUrl } from "@/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DataConnectionEditPage");
  return { title: t("adminMetaTitle") };
}

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
  const t = await getTranslations("DataConnectionEditPage");

  return (
    <Flex direction="column" gap="4">
      <Box>
        <Button asChild variant="ghost" size="1">
          <Link href={adminDataConnectionsUrl()}>
            <ArrowLeftIcon /> {t("back")}
          </Link>
        </Button>
      </Box>
      <DataConnectionForm
        mode="edit"
        dataConnection={toEditableDataConnection(dataConnection)}
      />

      <Suspense
        fallback={
          <Text size="2" color="gray">
            {t("loadingUsage")}
          </Text>
        }
      >
        <ConnectionUsage connectionId={dataConnection.data_connection_id} />
      </Suspense>

      {/* Below the usage list, which is what answers "can I delete this?" */}
      <DangerZone
        title={t("deleteTitle")}
        description={t("deleteDescription")}
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
    </Flex>
  );
}
