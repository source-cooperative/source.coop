import { Card } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { getUsage } from "@/lib/clients/analytics";
import { MonoLabel } from "./panels";
import { HELP } from "./style";
import { UsagePanel } from "./UsagePanel";

interface UsageCardProps {
  accountId: string;
  productId: string;
}

/**
 * Server component: fetches recent usage and renders the analytics card —
 * the same downloads summary for every viewer (the full analytics page is
 * reached via the manager-only ANALYTICS tab). Renders nothing when
 * analytics is unconfigured or the query fails, so the page never depends
 * on the analytics backend. Render inside <Suspense>.
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
          <MonoLabel help={HELP.window}>{usage.days.length} days</MonoLabel>
        }
      >
        <UsagePanel days={usage.days} totals={usage.totals} />
      </SectionHeader>
    </Card>
  );
}
