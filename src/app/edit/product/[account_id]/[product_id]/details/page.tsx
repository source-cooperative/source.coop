import { ProductCreationForm } from "@/components/features/products/ProductCreationForm";
import { productsTable, accountsTable } from "@/lib/clients/database";
import { notFound } from "next/navigation";
import { getPageSession } from "@/lib/api/utils";

interface DetailsPageProps {
  params: Promise<{ account_id: string; product_id: string }>;
}

export default async function DetailsPage({ params }: DetailsPageProps) {
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

  return (
    <ProductCreationForm
      potentialOwnerAccounts={[account]}
      product={product}
      mode="edit"
    />
  );
}
