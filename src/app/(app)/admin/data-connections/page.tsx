import { Metadata } from "next";
import { accountsTable, dataConnectionsTable } from "@/lib/clients";
import { Flex, Button, Heading } from "@radix-ui/themes";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DataConnectionsList } from "@/components/features/data-connections";
import {
  adminDataConnectionCreateUrl,
  adminDataConnectionEditUrl,
} from "@/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminDataConnectionsPage");
  return { title: t("metaTitle") };
}

export default async function DataConnectionsPage() {
  const connections = (await dataConnectionsTable.listAll()).sort(
    (a, b) =>
      a.details.provider.localeCompare(b.details.provider) ||
      a.name.localeCompare(b.name)
  );

  const ownerIds = connections
    .map((conn) => conn.owner)
    .filter((id): id is string => Boolean(id));
  const ownerAccounts = Object.fromEntries(
    (await accountsTable.fetchManyByIds(ownerIds)).map((acct) => [
      acct.account_id,
      acct,
    ])
  );
  const t = await getTranslations("AdminDataConnectionsPage");

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="4">{t("title")}</Heading>
        <Button asChild size="2" highContrast>
          <Link href={adminDataConnectionCreateUrl()}>{t("newConnection")}</Link>
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
