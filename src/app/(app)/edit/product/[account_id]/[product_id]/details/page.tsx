import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCreationForm } from "@/components/features/products/ProductCreationForm";
import {
  productsTable,
  accountsTable,
  dataConnectionsTable,
} from "@/lib/clients/database";
import { DataConnection, DataConnectionObjectSchema } from "@/types";

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

  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }

  // Get the account for the potential owner accounts array (needed by the form)
  const account = await accountsTable.fetchById(account_id);
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

  return (
    <ProductCreationForm
      potentialOwnerAccounts={[account]}
      product={product}
      dataConnections={dataConnections}
      mode="edit"
    />
  );
}
