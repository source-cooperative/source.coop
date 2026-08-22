import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@radix-ui/themes";
import {
  ServiceAccountDetail,
  loadAccountOrNotFound,
  mockServiceAccounts,
  planChanges,
} from "@/components/features/service-accounts";
import { createServiceAccountUrl } from "@/lib/urls";

export const metadata: Metadata = {
  title: "Service account",
};

interface PageProps {
  params: Promise<{ account_id: string; service_account_id: string }>;
}

/** Design mock for source-cooperative/source.coop#491. Persists nothing. */
export default async function ServiceAccountDetailPage({ params }: PageProps) {
  const { account_id, service_account_id } = await params;
  const { products } = await loadAccountOrNotFound(account_id);

  const entry = mockServiceAccounts(
    account_id,
    products.map((product) => product.product_id)
  ).find((candidate) => candidate.values.name === decodeURIComponent(service_account_id));

  if (!entry) {
    notFound();
  }

  return (
    <Box>
      <ServiceAccountDetail
        plan={planChanges(entry.values)}
        values={entry.values}
        // A key is only ever shown at creation, never on a later visit.
        issuedKey={null}
        lastAuthenticated={entry.lastAuthenticated}
        disabled={entry.disabled}
        editHref={`${createServiceAccountUrl(account_id)}?prefill=${encodeURIComponent(entry.values.name)}`}
      />
    </Box>
  );
}
