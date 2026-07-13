import Link from "next/link";
import { Box, Card, Flex, Text, Tooltip } from "@radix-ui/themes";
import { LockClosedIcon } from "@radix-ui/react-icons";
import { SectionHeader } from "@/components/core/SectionHeader";
import { getUsage } from "@/lib/clients/analytics";
import { productAnalyticsUrl } from "@/lib/urls";
import { UsagePanel } from "./UsagePanel";

interface UsageCardProps {
  accountId: string;
  productId: string;
  /**
   * Whether the viewer manages the product (owner/maintainer/admin):
   * unlocks the USERS tab and the link to the /-/analytics page.
   */
  canManage?: boolean;
}

/**
 * Server component: fetches recent usage and renders the analytics card —
 * public viewers get the downloads stats; managers also get the USERS tab
 * and the "View all analytics" link. Renders nothing when analytics is
 * unconfigured or the query fails, so the page never depends on the
 * analytics backend. Render inside <Suspense>.
 */
export async function UsageCard({
  accountId,
  productId,
  canManage = false,
}: UsageCardProps) {
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
          users={canManage ? usage.users : undefined}
        />
        {canManage && (
          <Box mt="3" pt="3" style={{ borderTop: "1px solid var(--gray-4)" }}>
            <Tooltip content="The Users tab and full analytics are visible only to owners and maintainers.">
              <Link href={productAnalyticsUrl(accountId, productId)}>
                <Flex display="inline-flex" align="center" gap="1">
                  <Text size="1">View all analytics →</Text>
                  <LockClosedIcon width="11" height="11" color="var(--gray-9)" />
                </Flex>
              </Link>
            </Tooltip>
          </Box>
        )}
      </SectionHeader>
    </Card>
  );
}
