import { getPageSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";
import { productsTable, dataConnectionsTable } from "@/lib/clients";
import { notFound } from "next/navigation";
import { ProductMirrorsManager } from "@/components/features/data-connections";
import { toDataConnectionOption } from "@/components/features/data-connections/redact";

interface ProductDataConnectionsPageProps {
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function ProductDataConnectionsPage({
  params,
}: ProductDataConnectionsPageProps) {
  const { account_id, product_id } = await params;

  const session = await getPageSession();
  const product = await productsTable.fetchById(account_id, product_id);

  if (!product) {
    notFound();
  }

  const userIsAdmin = isAdmin(session);

  // Connections are only needed to populate the admin "add" picker; non-admins
  // see their existing mirrors read-only. Redact to a secret-free option shape
  // so credentials never reach the client.
  const availableConnections = userIsAdmin
    ? (await dataConnectionsTable.listAll()).map(toDataConnectionOption)
    : [];

  return (
    <ProductMirrorsManager
      product={product}
      availableConnections={availableConnections}
      isAdmin={userIsAdmin}
    />
  );
}
