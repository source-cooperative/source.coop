import { Box, Card } from "@radix-ui/themes";
import { SectionHeader } from "@/components/core/SectionHeader";
import { getUsage } from "@/lib/clients/analytics";
import { UsagePanel } from "./UsagePanel";

interface UsageCardProps {
  accountId: string;
  productId: string;
  /** When set, usage is scoped to this object instead of the whole product. */
  objectPath?: string;
  /**
   * "card" for standalone placement (product meta column); "section" when
   * already inside a Card (the object view in Product Contents).
   */
  variant?: "card" | "section";
}

/**
 * Server component: fetches 28-day usage and renders the metrics card.
 * Renders nothing when analytics is unconfigured or the query fails, so the
 * page never depends on the analytics backend. Render inside <Suspense>.
 */
export async function UsageCard({
  accountId,
  productId,
  objectPath,
  variant = "card",
}: UsageCardProps) {
  const usage = await getUsage(accountId, productId, objectPath);
  if (!usage) return null;

  const section = (
    <SectionHeader title="Usage">
      <UsagePanel
        days={usage.days}
        totals={usage.totals}
        scope={objectPath === undefined ? "product" : "object"}
      />
    </SectionHeader>
  );

  if (variant === "section") {
    return <Box mt="5">{section}</Box>;
  }
  return <Card size={{ initial: "2", sm: "1" }}>{section}</Card>;
}
