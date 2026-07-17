import { getPageSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";
import { canManageDataConnection } from "@/lib/data-connections";
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

  // A mirror only links to a connection's admin form when the product owner
  // owns that connection (or the viewer is an admin), so resolve each mirror's
  // connection owner here. Reads are globally cached, so per-mirror fetches are
  // cheap even when the admin list above already loaded them.
  const mirrorConnectionIds = [
    ...new Set(
      Object.values(product.metadata.mirrors).map((m) => m.connection_id)
    ),
  ];
  const mirrorConnections = (
    await Promise.all(
      mirrorConnectionIds.map((id) => dataConnectionsTable.fetchById(id))
    )
  ).filter((c) => c != null);
  const ownedConnectionIds = mirrorConnections
    .filter((c) => c.owner === product.account_id)
    .map((c) => c.data_connection_id);

  // Display name and bare bucket/container per connection, for the cards.
  const connectionInfo = Object.fromEntries(
    mirrorConnections.map((c) => [
      c.data_connection_id,
      {
        name: c.name,
        bucket: "bucket" in c.details ? c.details.bucket : c.details.container_name,
      },
    ])
  );

  // Editing a mirror's prefix needs the intersection of product and connection
  // management. Page access already required PutRepository on the product (the
  // layout gate), so here we only resolve the connection side per mirror.
  const editablePrefixConnectionIds = (
    await Promise.all(
      mirrorConnections.map(async (c) =>
        (await canManageDataConnection(session, c))
          ? c.data_connection_id
          : null
      )
    )
  ).filter((id): id is string => id != null);

  return (
    <ProductMirrorsManager
      product={product}
      availableConnections={availableConnections}
      isAdmin={userIsAdmin}
      ownedConnectionIds={ownedConnectionIds}
      connectionInfo={connectionInfo}
      editablePrefixConnectionIds={editablePrefixConnectionIds}
    />
  );
}
