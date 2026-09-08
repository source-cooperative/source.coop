import { Metadata } from "next";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core/FormTitle";
import {
  ServiceAccountList,
  loadAccountOrNotFound,
  mockServiceAccounts,
  planChanges,
} from "@/components/features/service-accounts";
import { createServiceAccountUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Service accounts",
};

interface PageProps {
  params: Promise<{ account_id: string }>;
}

/** Design mock for source-cooperative/source.coop#491. Persists nothing. */
export default async function ServiceAccountsPage({ params }: PageProps) {
  const { account_id } = await params;
  const { products } = await loadAccountOrNotFound(account_id);

  const accounts = mockServiceAccounts(
    account_id,
    products.map((product) => product.product_id)
  );

  return (
    <Box>
      <FormTitle
        title="Service Accounts"
        description="Logins for software — a nightly sync, a publishing pipeline — granted and revoked without sharing anyone's account."
      />
      <ServiceAccountList
        accounts={accounts.map((entry) => ({
          ...entry,
          plan: planChanges(entry.values),
          editHref: `${createServiceAccountUrl(account_id)}?prefill=${encodeURIComponent(
            entry.values.name
          )}`,
        }))}
        createHref={createServiceAccountUrl(account_id)}
      />
    </Box>
  );
}
