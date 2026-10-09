import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@radix-ui/themes";
import { getTranslations } from "next-intl/server";
import { DataConnectionForm } from "@/components/features/data-connections";
import { FormTitle } from "@/components/core/FormTitle";
import { accountsTable } from "@/lib/clients";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccountDataConnections } from "@/lib/api/authz";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AccountCreateDataConnectionPage");
  return { title: t("metaTitle") };
}

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function AccountCreateDataConnectionPage({
  params,
}: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  const account = await accountsTable.fetchById(account_id);
  if (!account || !canManageAccountDataConnections(session, account)) {
    notFound();
  }
  const t = await getTranslations("AccountCreateDataConnectionPage");

  return (
    <Box>
      <FormTitle
        title={t("title")}
        description={t("description")}
      />
      <DataConnectionForm mode="create" ownerAccountId={account_id} />
    </Box>
  );
}
