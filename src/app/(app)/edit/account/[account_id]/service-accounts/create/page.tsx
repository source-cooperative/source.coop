import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core/FormTitle";
import { ServiceAccountForm } from "@/components/features/service-accounts";
import { accountsTable, productsTable } from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { canManageAccount } from "@/lib/api/authz";

export const metadata: Metadata = { title: "Create service account" };

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function CreateServiceAccountPage({ params }: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  const owner = await accountsTable.fetchById(account_id);
  if (!owner || !canManageAccount(session, owner)) {
    notFound();
  }
  const products = (await productsTable.listByAccountAll(account_id)).map(
    ({ product_id, title }) => ({ product_id, title })
  );

  return (
    <Box>
      <FormTitle
        title="New Service Account"
        description="A login for software that you grant and revoke without sharing anyone's account."
      />
      <ServiceAccountForm ownerAccountId={account_id} products={products} />
    </Box>
  );
}
