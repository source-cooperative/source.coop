/**
 * Product Layout - Shared layout for product pages
 *
 * This layout persists the ProductHeader across navigation within the product,
 * preventing unnecessary refetches when moving between paths.
 *
 * However, neither sibling files not-found.tsx nor loading.tsx are properly handled, so
 * we need to use a parent route-group to handle these cases.
 */

import { ProductHeader } from "@/components";
import { productsTable } from "@/lib/clients/database";
import { notFound } from "next/navigation";

interface ProductHeaderProps {
  children: React.ReactNode;
  readme: React.ReactNode;
  params: Promise<{ account_id: string; product_id: string; path?: string[] }>;
}

export default async function ProductHeaderPage({
  params,
}: ProductHeaderProps) {
  // Then check if product exists
  const { account_id, product_id } = await params;
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }

  return <ProductHeader product={product} />;
}
