import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box, Flex, Button } from "@radix-ui/themes";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { accountsTable, dataConnectionsTable } from "@/lib/clients";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccountDataConnections } from "@/lib/api/authz";
import { FormTitle } from "@/components/core/FormTitle";
import { DataConnectionsList } from "@/components/features/data-connections";
import {
  accountDataConnectionCreateUrl,
  accountDataConnectionEditUrl,
} from "@/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AccountDataConnectionsPage");
  return { title: t("metaTitle") };
}

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
  const t = await getTranslations("AccountDataConnectionsPage");

  return (
    <Box>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <FormTitle
            title={t("title")}
            description={t("description")}
          />
        </Box>
        <Button asChild size="2" highContrast>
          <Link href={accountDataConnectionCreateUrl(account_id)}>
            {t("newConnection")}
          </Link>
        </Button>
      </Flex>

      <DataConnectionsList
        connections={connections}
        editHref={(id) => accountDataConnectionEditUrl(account_id, id)}
      />
    </Box>
  );
}
