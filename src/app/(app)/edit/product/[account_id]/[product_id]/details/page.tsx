import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCreationForm } from "@/components/features/products/ProductCreationForm";
import { DeleteProductModal } from "@/components/features/products/DeleteProductModal";
import { DeleteAllObjectsModal } from "@/components/features/products/DeleteAllObjectsModal";
import {
  productsTable,
  accountsTable,
  dataConnectionsTable,
} from "@/lib/clients/database";
import { getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import {
  Actions,
  DataConnection,
  DataConnectionObjectSchema,
} from "@/types";
import { DangerZone, DangerZoneItem } from "@/components/core";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id, product_id } = await params;
  const product = await productsTable.fetchById(account_id, product_id);
  return { title: `Edit ${product!.title} details` };
}

interface PageProps {
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function DetailsPage({ params }: PageProps) {
  const { account_id, product_id } = await params;

  const [product, account, session] = await Promise.all([
    productsTable.fetchById(account_id, product_id),
    accountsTable.fetchById(account_id),
    getPageSession(),
  ]);

  if (!product) {
    notFound();
  }

  if (!account) {
    notFound();
  }

  // Resolve the product's data connection so the visibility options stay
  // constrained to what that connection allows. Credentials are stripped before
  // the connection reaches the client form.
  const connection = await dataConnectionsTable.fetchById(
    product.metadata.primary_mirror
  );
  const dataConnections: DataConnection[] = connection
    ? [
        DataConnectionObjectSchema.omit({ authentication: true }).parse(
          connection
        ),
      ]
    : [];

  const canDelete = isAuthorized(session, product, Actions.DeleteRepository);
  // Emptying is for those who run the product (its owners and maintainers),
  // and never on a read-only connection, whose objects Source doesn't delete.
  // The proxy still authorizes every object delete on its own.
  const canEmpty =
    !!connection &&
    !connection.read_only &&
    isAuthorized(session, product, Actions.PutRepository);

  return (
    <>
      <ProductCreationForm
        potentialOwnerAccounts={[account]}
        product={product}
        dataConnections={dataConnections}
        mode="edit"
      />

      {(canEmpty || canDelete) && (
        <DangerZone>
          {canEmpty && (
            <DangerZoneItem
              title="Delete all objects"
              description="Permanently deletes every object stored in this product. The product, its page and its memberships stay."
              action={
                <DeleteAllObjectsModal
                  accountId={account_id}
                  productId={product_id}
                />
              }
            />
          )}
          {canDelete && (
            <DangerZoneItem
              title="Delete this product"
              description={
                connection?.read_only
                  ? "Permanent. Removes the product record and its memberships. Its objects are on a read-only connection, so they stay where they are."
                  : "Permanent. Removes the product record and its memberships. A product that still holds objects can't be deleted: delete its objects first."
              }
              action={
                <DeleteProductModal
                  accountId={account_id}
                  productId={product_id}
                />
              }
            />
          )}
        </DangerZone>
      )}
    </>
  );
}
