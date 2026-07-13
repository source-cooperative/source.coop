import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { LockClosedIcon } from "@radix-ui/react-icons";
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
  // Same full gate as the page body — generateMetadata streams
  // independently, and unauthorized must look exactly like nonexistent
  // (no "— Analytics" title on the 404).
  const product = await getAuthorizedProduct(account_id, product_id);
  const session = await getPageSession();
  if (!isAuthorized(session, product, Actions.PutRepository)) {
    notFound();
  }
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

      <Flex align="center" gap="1" mb="3">
        <LockClosedIcon width="12" height="12" color="var(--gray-9)" />
        <Text size="1" color="gray">
          Visible only to this product&apos;s owners, maintainers, and site
          admins.
        </Text>
      </Flex>

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
