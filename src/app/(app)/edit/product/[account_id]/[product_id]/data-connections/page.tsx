import { getPageSession } from "@/lib/api/utils";
import { canManageAccount, isAdmin } from "@/lib/api/authz";
import {
  canManageDataConnection,
  canUseDataConnectionFor,
} from "@/lib/data-connections";
import { accountsTable, productsTable, dataConnectionsTable } from "@/lib/clients";
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

  // Mirrors are the owning account's storage, so managing them requires
  // administering that account — an owner/maintainer of the org (or an admin).
  // The layout's PutRepository gate also admits a membership scoped to this one
  // product; such a user sees their mirrors read-only and is told why.
  const ownerAccount = await accountsTable.fetchById(product.account_id);
  const canManageMirrors =
    ownerAccount != null && canManageAccount(session, ownerAccount);

  // Connections are only needed to populate the "add" picker. Offer exactly what
  // may back a product of this account: system-level (unowned) connections plus
  // the account's own. Redact to a secret-free option shape so credentials never
  // reach the client.
  const availableConnections = canManageMirrors
    ? (await dataConnectionsTable.listAll())
        .filter((c) => canUseDataConnectionFor(session, c, product.account_id))
        .map(toDataConnectionOption)
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
        provider: c.details.provider,
      },
    ])
  );

  // Editing a mirror's prefix needs the intersection of the account gate above
  // and managing the connection itself, so resolve the connection side per
  // mirror — a prefix re-points where the product's data lives.
  const editablePrefixConnectionIds = canManageMirrors
    ? (
        await Promise.all(
          mirrorConnections.map(async (c) =>
            (await canManageDataConnection(session, c))
              ? c.data_connection_id
              : null
          )
        )
      ).filter((id): id is string => id != null)
    : [];

  return (
    <ProductMirrorsManager
      product={product}
      availableConnections={availableConnections}
      canManageMirrors={canManageMirrors}
      isAdmin={userIsAdmin}
      ownedConnectionIds={ownedConnectionIds}
      connectionInfo={connectionInfo}
      editablePrefixConnectionIds={editablePrefixConnectionIds}
    />
  );
}
