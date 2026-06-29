import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCreationForm } from "@/components/features/products/ProductCreationForm";
import { DeleteProductModal } from "@/components/features/products/DeleteProductModal";
import {
  productsTable,
  accountsTable,
  dataConnectionsTable,
} from "@/lib/clients/database";
import { getPageSession } from "@/lib";
import { isAuthorized, isAdmin } from "@/lib/api/authz";
import {
  Actions,
  DataConnection,
  DataConnectionObjectSchema,
} from "@/types";
import { Box, Separator, Text } from "@radix-ui/themes";

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
  // Keeping the underlying data on delete is allowed for non-system
  // (account-owned) connections, or for admins on any connection. The server
  // re-checks this; this only decides whether to offer the option in the UI.
  const canPreserveData = !!connection?.owner || isAdmin(session);

  return (
    <>
      <ProductCreationForm
        potentialOwnerAccounts={[account]}
        product={product}
        dataConnections={dataConnections}
        mode="edit"
      />

      {canDelete && (
        <>
          <Separator size="4" my="6" />
          <Box>
            <Text as="p" size="2" color="gray" mb="3">
              Deleting this product is permanent and cannot be undone. All
              associated data, memberships, and records will be removed.
            </Text>
            <DeleteProductModal
              accountId={account_id}
              productId={product_id}
              canPreserveData={canPreserveData}
            />
          </Box>
        </>
      )}
    </>
  );
}
