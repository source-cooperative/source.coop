import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Box, Button, Text } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { DangerZone } from "@/components/core";
import { accountDataConnectionsUrl } from "@/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("DataConnectionEditPage");
  return { title: t("metaTitle") };
}

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
  const t = await getTranslations("DataConnectionEditPage");

  return (
    <Box>
      <Button asChild variant="ghost" size="1" mb="4">
        <Link href={accountDataConnectionsUrl(account_id)}>
          <ArrowLeftIcon /> {t("back")}
        </Link>
      </Button>
      <DataConnectionForm
        mode="edit"
        ownerAccountId={account_id}
        dataConnection={toEditableDataConnection(dataConnection)}
      />

      <Box mt="6">
        <Suspense
          fallback={
            <Text size="2" color="gray">
              {t("loadingUsage")}
            </Text>
          }
        >
          <ConnectionUsage connectionId={dataConnection.data_connection_id} />
        </Suspense>
      </Box>

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
    </Box>
  );
}
