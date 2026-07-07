import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types/shared";
import {
  USAGE_DAYS,
  USAGE_WINDOWS,
  getProductBreakdowns,
  getUsage,
  type UsageWindow,
} from "@/lib/clients/analytics";
import {
  ProductAnalyticsView,
  ProductTabs,
} from "@/components/features/analytics";
import { SectionHeader } from "@/components/core/SectionHeader";
import { productAnalyticsUrl } from "@/lib/urls";
import { getAuthorizedProduct } from "../../[[...path]]/data";

interface PageProps {
  params: Promise<{ account_id: string; product_id: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id, product_id } = await params;
  // Authorize before exposing anything, like the product page does.
  const product = await getAuthorizedProduct(account_id, product_id);
  return { title: `${product.title || product_id} — Analytics` };
}

function parseWindow(value: string | string[] | undefined): UsageWindow {
  const days = Number(Array.isArray(value) ? value[0] : value);
  return (USAGE_WINDOWS as readonly number[]).includes(days)
    ? (days as UsageWindow)
    : USAGE_DAYS;
}

export default async function ProductAnalyticsPage({
  params,
  searchParams,
}: PageProps) {
  const { account_id, product_id } = await params;
  const product = await getAuthorizedProduct(account_id, product_id);

  // Analytics are for the people who run the product (same gate as the Edit
  // button); everyone else gets the same 404 an unknown path would.
  const session = await getPageSession();
  if (!isAuthorized(session, product, Actions.PutRepository)) {
    notFound();
  }

  const windowDays = parseWindow((await searchParams).window);
  const [usage, breakdowns] = await Promise.all([
    getUsage(account_id, product_id, undefined, windowDays),
    getProductBreakdowns(account_id, product_id, windowDays),
  ]);

  return (
    <Box mt="4">
      <ProductTabs
        accountId={account_id}
        productId={product_id}
        active="analytics"
      />
      <Heading size="7" my="4">
        {product.title || product_id}
      </Heading>

      <Card size="2">
        <SectionHeader
          title="Product Analytics"
          rightButton={
            <Flex gap="1">
              {USAGE_WINDOWS.map((days) => (
                <Button
                  key={days}
                  asChild
                  size="1"
                  variant={days === windowDays ? "solid" : "soft"}
                >
                  <Link
                    href={`${productAnalyticsUrl(account_id, product_id)}&window=${days}`}
                  >
                    {days}d
                  </Link>
                </Button>
              ))}
            </Flex>
          }
        >
          {usage ? (
            <ProductAnalyticsView
              accountId={account_id}
              productId={product_id}
              days={usage.days}
              totals={usage.totals}
              users={usage.users}
              breakdowns={breakdowns}
            />
          ) : (
            <Text size="2" color="gray">
              Analytics are unavailable right now. Try again in a few minutes.
            </Text>
          )}
        </SectionHeader>
      </Card>
    </Box>
  );
}
