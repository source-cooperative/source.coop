/**
 * Product Layout - Shared layout for product pages
 *
 * This layout persists the ProductHeader across navigation within the product,
 * preventing unnecessary refetches when moving between paths.
 *
 * However, neither sibling files not-found.tsx nor loading.tsx are properly handled, so
 * we need to use a parent route-group to handle these cases.
 */

import { ProductHeader, SectionHeader } from "@/components";
import { productsTable } from "@/lib/clients/database";
import { Box, Card } from "@radix-ui/themes";
import { notFound } from "next/navigation";
import { Suspense } from "react";

interface ProductLayoutProps {
  children: React.ReactNode;
  breadcrumb: React.ReactNode;
  readme: React.ReactNode;
  params: Promise<{ account_id: string; product_id: string; path?: string[] }>;
}

export default async function ProductLayout({
  params,
  children,
  breadcrumb,
  readme,
}: ProductLayoutProps) {
  // Then check if product exists
  const { account_id, product_id, path } = await params;
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }

  return (
    <>
      <ProductHeader product={product} />
      <Card mt="4">
        <SectionHeader title="Product Contents">
          <Box
            pb="3"
            mb="3"
            style={{
              borderBottom: "1px solid var(--gray-5)",
            }}
          >
            {breadcrumb}
          </Box>
        </SectionHeader>
        {children}
      </Card>

      {path === undefined && readme}
    </>
  );
}
