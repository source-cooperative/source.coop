/**
 * Product Layout - Shared layout for product pages
 *
 * This layout persists the ProductHeader across navigation within the product,
 * preventing unnecessary refetches when moving between paths.
 *
 * However, neither sibling files not-found.tsx nor loading.tsx are properly handled, so
 * we need to use a parent route-group to handle these cases.
 */

import {
  BreadcrumbNav,
  ProductHeader,
  SectionHeader,
  PendingInvitationBanner,
} from "@/components";
import { productsTable } from "@/lib/clients/database";
import { productUrl } from "@/lib/urls";
import { Box, Card } from "@radix-ui/themes";
import { notFound } from "next/navigation";
import { getPendingInvitation } from "@/lib/actions/memberships";

interface ProductLayoutProps {
  children: React.ReactNode;
  readme: React.ReactNode;
  params: Promise<{ account_id: string; product_id: string; path?: string[] }>;
}

export default async function ProductLayout({
  params,
  children,
  readme,
}: ProductLayoutProps) {
  // Then check if product exists
  const { account_id, product_id, path } = await params;
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }

  // Check for pending invitation
  const pendingInvitation = await getPendingInvitation(account_id, product_id);

  return (
    <>
      {/* Show pending invitation banner if exists */}
      {pendingInvitation && (
        <PendingInvitationBanner
          invitation={pendingInvitation}
          organizationName={product.account?.name || account_id}
          productName={product.title || product_id}
        />
      )}

      <Box mt="4">
        <ProductHeader product={product} />
      </Box>

      <Card mt="4">
        <SectionHeader title="Product Contents">
          <Box
            pb="3"
            mb="3"
            style={{
              borderBottom: "1px solid var(--gray-5)",
            }}
          >
            <BreadcrumbNav
              path={path?.map((p) => decodeURIComponent(p)) || []}
              baseUrl={productUrl(account_id, product_id)}
            />
          </Box>
        </SectionHeader>
        {children}
      </Card>

      {path === undefined && readme}
    </>
  );
}
