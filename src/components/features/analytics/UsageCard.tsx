import { Card } from "@radix-ui/themes";
import { getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/core/SectionHeader";
import { getUsage } from "@/lib/clients/analytics";
import { MonoLabel } from "./panels";
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
  const t = await getTranslations("UsageCard");
  const tHelp = await getTranslations("AnalyticsHelp");

  return (
    // flexShrink 0: in the grid-stretched meta column an over-constrained
    // flex layout would otherwise crush the card and clip the chart
    // (Radix Card is overflow:hidden).
    <Card size={{ initial: "2", sm: "1" }} style={{ flexShrink: 0 }}>
      <SectionHeader
        title={t("title")}
        rightButton={
          <MonoLabel help={tHelp("window")}>
            {t("windowDays", { days: usage.days.length })}
          </MonoLabel>
        }
      >
        <UsagePanel days={usage.days} totals={usage.totals} />
      </SectionHeader>
    </Card>
  );
}
