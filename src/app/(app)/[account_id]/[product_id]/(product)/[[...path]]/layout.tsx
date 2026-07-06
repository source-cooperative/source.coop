/**
 * Product Layout - Shared layout for product pages
 *
 * This layout persists the ProductHeader across navigation within the product,
 * preventing unnecessary refetches when moving between paths.
 *
 * However, neither sibling files not-found.tsx nor loading.tsx are properly handled, so
 * we need to use a parent route-group to handle these cases.
 */

import { Suspense } from "react";
import { BreadcrumbNav } from "@/components/display/BreadcrumbNav";
import { FetchCredentialsButton } from "@/components/features/uploader/FetchCredentialsButton";
import { PendingInvitationBanner } from "@/components/features/memberships/PendingInvitationBanner";
import { ProductSummaryCard } from "@/components/features/products/ProductSummaryCard";
import { ProductMetaCard } from "@/components/features/products/ProductMetaCard";
import {
  ProductTabs,
  UsageCard,
  UsageCardSkeleton,
} from "@/components/features/analytics";
import { isAnalyticsConfigured } from "@/lib/clients/analytics";
import { SectionHeader } from "@/components/core/SectionHeader";
import { Dropzone } from "@/components/features/uploader/Dropzone";
import { getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { dataConnectionsTable } from "@/lib/clients/database";
import { productUrl } from "@/lib/urls";
import { Actions } from "@/types/shared";
import { Box, Callout, Card, Flex, Grid } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
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

  // Same gate as the Edit button and the /-/analytics route: the analytics
  // tab and "view all" link only exist for people who run the product.
  const canViewAnalytics = isAuthorized(
    session,
    product,
    Actions.PutRepository,
  );

  // Check for pending invitation
  const pendingInvitation = await getPendingInvitation(account_id, product_id);

  return (
    <>
      <ProductSchemaMetadata product={product} />
      {/* A deactivated product is visible only to its owners/maintainers and
          admins (backend authz 404s everyone else) — make that state
          unmistakable to whoever can see it. */}
      {product.disabled && (
        <Box mt="4">
          <Callout.Root color="amber" role="alert">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              This product is deactivated. It is hidden from everyone except its
              owners and administrators.
            </Callout.Text>
          </Callout.Root>
        </Box>
      )}
      {/* Show pending invitation banner if exists */}
      {pendingInvitation && (
        <PendingInvitationBanner
          invitation={pendingInvitation}
          organizationName={product.account?.name || account_id}
          productName={product.title || product_id}
        />
      )}

      {/* Tab strip only at the product root, for people who can manage it */}
      {canViewAnalytics && !prefix && (
        <Box mt="4">
          <ProductTabs
            accountId={account_id}
            productId={product_id}
            active="product"
          />
        </Box>
      )}

      {/* Two columns: summary + contents (+ readme) on the left; details
          and analytics stacked on the right. */}
      <Grid mt="4" columns={{ initial: "1", md: "3" }} gap={{ initial: "4", md: "6" }}>
        <Flex
          direction="column"
          gap="4"
          className="product-summary"
          style={{ gridColumn: "span 2" }}
          px={{ initial: "4", md: "0" }}
        >
          <ProductSummaryCard product={product} />
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
        </Flex>

        <Flex width="100%" className="product-meta" direction="column" gap="4">
          <ProductMetaCard product={product} />
          {/* Analytics are for the people who run the product, like the
              /-/analytics page. Streams in after the page shell; hidden when
              analytics is off. The skeleton reserves the card's space so
              warm-cache data fills in instead of reflowing the column. */}
          {canViewAnalytics && (
            <Suspense
              fallback={isAnalyticsConfigured() ? <UsageCardSkeleton /> : null}
            >
              <UsageCard accountId={account_id} productId={product_id} />
            </Suspense>
          )}
        </Flex>
      </Grid>

      {/* README/viewer as a full-width row below both columns (the slot
          renders its own Card with mt, or null when there's no README) */}
      {readme}
    </>
  );
}
