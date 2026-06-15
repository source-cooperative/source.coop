/**
 * Product Layout - Shared layout for product pages
 *
 * This layout persists the ProductHeader across navigation within the product,
 * preventing unnecessary refetches when moving between paths.
 *
 * However, neither sibling files not-found.tsx nor loading.tsx are properly handled, so
 * we need to use a parent route-group to handle these cases.
 */

import { BreadcrumbNav } from "@/components/display/BreadcrumbNav";
import { FetchCredentialsButton } from "@/components/features/uploader/FetchCredentialsButton";
import { PendingInvitationBanner } from "@/components/features/memberships/PendingInvitationBanner";
import { ProductHeader } from "@/components/features/products/ProductHeader";
import { SectionHeader } from "@/components/core/SectionHeader";
import { Dropzone } from "@/components/features/uploader/Dropzone";
import { getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { dataConnectionsTable, productsTable } from "@/lib/clients/database";
import { productUrl } from "@/lib/urls";
import { Actions } from "@/types/shared";
import { Box, Card, Flex } from "@radix-ui/themes";
import { getPendingInvitation } from "@/lib/actions/memberships";
import { ProductSchemaMetadata } from "@/components/features/products/ProductSchemaMetadata";
import { getAuthorizedProduct } from "./data";

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
  // Fetch + authorize in one place. Throws a 404 for missing products or
  // unauthorized viewers. The session is also needed below for the write check.
  const { account_id, product_id, path } = await params;
  const product = await getAuthorizedProduct(account_id, product_id);
  const session = await getPageSession();
  const prefix = path ? path.join("/") : "";

  // Hide data-editing controls when the backing data connection is read-only
  const primaryMirror =
    product.metadata.mirrors[product.metadata.primary_mirror];
  const dataConnection = primaryMirror
    ? await dataConnectionsTable.fetchById(primaryMirror.connection_id)
    : null;
  const canWriteData =
    !!dataConnection &&
    !dataConnection.read_only &&
    isAuthorized(session, product, Actions.WriteRepositoryData);

  // Check for pending invitation
  const pendingInvitation = await getPendingInvitation(account_id, product_id);

  return (
    <>
      <ProductSchemaMetadata product={product} />
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
      <Box mt="4">
        <Dropzone product={product} prefix={prefix}>
          <Card>
            <SectionHeader
              title="Product Contents"
              rightButton={
                canWriteData && (
                  <FetchCredentialsButton
                    scope={{ accountId: account_id, productId: product_id }}
                    prefix={prefix}
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
                </Flex>
              </Box>
            </SectionHeader>
            {children}
          </Card>
        </Dropzone>
      </Box>

      {readme}
    </>
  );
}
