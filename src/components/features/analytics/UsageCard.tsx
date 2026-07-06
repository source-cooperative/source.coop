import Link from "next/link";
import { Box, Card, Text } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { getUsage } from "@/lib/clients/analytics";
import { productAnalyticsUrl } from "@/lib/urls";
import { UsagePanel } from "./UsagePanel";

interface UsageCardProps {
  accountId: string;
  productId: string;
}

/**
 * Server component: fetches recent usage and renders the analytics card.
 * Only render for viewers who can manage the product (the same audience as
 * the /-/analytics page the footer links to). Renders nothing when analytics
 * is unconfigured or the query fails, so the page never depends on the
 * analytics backend. Render inside <Suspense>.
 */
export async function UsageCard({ accountId, productId }: UsageCardProps) {
  const usage = await getUsage(accountId, productId);
  if (!usage) return null;

  return (
    // flexShrink 0: in the grid-stretched meta column an over-constrained
    // flex layout would otherwise crush the card and clip the chart
    // (Radix Card is overflow:hidden).
    <Card size={{ initial: "2", sm: "1" }} style={{ flexShrink: 0 }}>
      <SectionHeader
        title="Product Analytics"
        rightButton={
          <Text
            size="1"
            style={{
              fontFamily: "var(--code-font-family)",
              letterSpacing: "0.03em",
              color: "var(--gray-10)",
            }}
          >
            {usage.days.length} DAYS
          </Text>
        }
      >
        <UsagePanel
          days={usage.days}
          totals={usage.totals}
          users={usage.users}
        />
        <Box mt="3" pt="3" style={{ borderTop: "1px solid var(--gray-4)" }}>
          <Link href={productAnalyticsUrl(accountId, productId)}>
            <Text size="1">View all analytics →</Text>
          </Link>
        </Box>
      </SectionHeader>
    </Card>
  );
}
