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
  FetchCredentialsButton,
  ProductHeader,
  SectionHeader,
} from "@/components";
import { JumpToPrefix } from "@/components/features/products/JumpToPrefix";
import { getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { productsTable } from "@/lib/clients/database";
import { productUrl } from "@/lib/urls";
import { Actions } from "@/types/shared";
import { Box, Card, Flex } from "@radix-ui/themes";
import { notFound } from "next/navigation";

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
  const session = await getPageSession();
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    notFound();
  }

  return (
    <>
      <ProductHeader product={product} />
      <Card mt="4">
        <SectionHeader
          title="Product Contents"
          rightButton={
            isAuthorized(session, product, Actions.WriteRepositoryData) && (
              <FetchCredentialsButton
                scope={{ accountId: account_id, productId: product_id }}
                prefix={path ? path.join("/") : ""}
              />
            )
          }
        >
          <Box
            pb="3"
            mb="3"
            style={{
              borderBottom: "1px solid var(--gray-5)",
            }}
          >
            <Flex direction="row" gap="2" align="center" justify="between">
              <BreadcrumbNav
                path={path?.map((p) => decodeURIComponent(p)) || []}
                baseUrl={productUrl(account_id, product_id)}
              />
              <JumpToPrefix
                accountId={account_id}
                productId={product_id}
                currentPath={path || []}
                baseUrl={productUrl(account_id, product_id)}
              />
            </Flex>
          </Box>
        </SectionHeader>
        {children}
      </Card>

      {path === undefined && readme}
    </>
  );
}
