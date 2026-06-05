import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductCreationForm } from "@/components/features/products/ProductCreationForm";
import { productsTable, accountsTable, dataConnectionsTable } from "@/lib/clients/database";
import { ProductVisibility } from "@/types/product";

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
  const [account, dataConnection] = await Promise.all([
    accountsTable.fetchById(account_id),
    dataConnectionsTable.fetchById(product.metadata.primary_mirror),
  ]);

  if (!account) {
    notFound();
  }

  const allowedVisibilities =
    dataConnection?.allowed_visibilities ?? Object.values(ProductVisibility);

  return (
    <ProductCreationForm
      potentialOwnerAccounts={[account]}
      product={product}
      mode="edit"
      allowedVisibilities={allowedVisibilities}
    />
  );
}
