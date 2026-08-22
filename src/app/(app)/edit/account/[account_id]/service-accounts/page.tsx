import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core/FormTitle";
import { ServiceAccountForm } from "@/components/features/service-accounts";
import { accountsTable, productsTable } from "@/lib/clients/database";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";

export const metadata: Metadata = {
  title: "Service accounts",
};

interface PageProps {
  params: Promise<{ account_id: string }>;
}

/**
 * Design mock for source-cooperative/source.coop#491. Renders the proposed
 * service-account creation flow and, on submit, the rows it would write.
 * Persists nothing — this page exists so the data model can be reviewed
 * before it is built.
 */
export default async function ServiceAccountsPage({ params }: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  const account = await accountsTable.fetchById(account_id);

  // You must be able to manage the account to create something that acts on
  // its behalf — #491's "creator must hold a qualifying role on the owner
  // account". ListAccountMemberships is not enough: it returns true for any
  // signed-in user.
  if (!account || !isAuthorized(session, account, Actions.PutAccountProfile)) {
    notFound();
  }

  const products = await productsTable.listByAccountAll(account_id);

  return (
    <Box>
      <FormTitle
        title="Service Accounts"
        description="A login for software — a nightly sync, a publishing pipeline — that you grant and revoke without sharing anyone's account."
      />
      <ServiceAccountForm
        ownerAccountId={account_id}
        ownerType={
          account.type === "organization" ? "organization" : "individual"
        }
        products={products.map((product) => ({
          product_id: product.product_id,
          title: product.title ?? "",
        }))}
      />
    </Box>
  );
}
