import { Metadata } from "next";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components/core/FormTitle";
import {
  ServiceAccountForm,
  loadAccountOrNotFound,
  mockServiceAccounts,
} from "@/components/features/service-accounts";

export const metadata: Metadata = {
  title: "Create service account",
};

interface PageProps {
  params: Promise<{ account_id: string }>;
  searchParams: Promise<{ prefill?: string }>;
}

/** Design mock for source-cooperative/source.coop#491. Persists nothing. */
export default async function CreateServiceAccountPage({
  params,
  searchParams,
}: PageProps) {
  const { account_id } = await params;
  const { prefill } = await searchParams;
  const { ownerType, products } = await loadAccountOrNotFound(account_id);

  // `?prefill=` re-opens one of the fabricated accounts in the form, so the
  // edit path is reviewable too.
  const existing = prefill
    ? mockServiceAccounts(
        account_id,
        products.map((product) => product.product_id)
      ).find((entry) => entry.values.name === prefill)
    : undefined;

  return (
    <Box>
      <FormTitle
        title={existing ? `Edit ${existing.values.name}` : "New Service Account"}
        description="A login for software — a nightly sync, a publishing pipeline — that you grant and revoke without sharing anyone's account."
      />
      <ServiceAccountForm
        ownerAccountId={account_id}
        ownerType={ownerType}
        products={products}
        initialValues={existing?.values}
        initiallyDisabled={existing?.disabled ?? false}
      />
    </Box>
  );
}
