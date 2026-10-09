import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@radix-ui/themes";
import { getTranslations } from "next-intl/server";
import { FormTitle } from "@/components/core/FormTitle";
import { ServiceAccountForm } from "@/components/features/service-accounts";
import { accountsTable, productsTable } from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccountServiceAccounts } from "@/lib/api/authz";
import { CONFIG } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CreateServiceAccountPage");
  return { title: t("metaTitle") };
}

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function CreateServiceAccountPage({ params }: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  const owner = await accountsTable.fetchById(account_id);
  if (!owner || !canManageAccountServiceAccounts(session, owner)) {
    notFound();
  }
  const products = (await productsTable.listByAccountAll(account_id)).map(
    ({ product_id, title }) => ({ product_id, title })
  );
  const t = await getTranslations("CreateServiceAccountPage");

  return (
    <Box>
      <FormTitle
        title={t("title")}
        description={t("description")}
      />
      <ServiceAccountForm
        ownerAccountId={account_id}
        products={products}
        proxyOrigin={CONFIG.storage.endpoint}
      />
    </Box>
  );
}
