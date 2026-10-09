"use client";

import { useState } from "react";
import { Flex } from "@radix-ui/themes";
import { useFormatter, useTranslations } from "next-intl";
import type { UsagePoint, UsageTotals } from "@/lib/clients/analytics";
import { formatBytes } from "@/lib/format";
import { DownloadsChart, HoverCaption, Stat, StatRow } from "./panels";

// Kept here for its existing unit tests / import sites.
export { parseActiveIndex } from "./panels";

interface UsagePanelProps {
  days: UsagePoint[];
  totals: UsageTotals;
}

/**
 * Compact analytics card panel (issue #257 mocks): a stats row (downloads,
 * data served, countries) over a daily downloads bar chart — hovering a bar
 * shows that day's numbers. Users/audience detail lives on the full
 * analytics page, not in the card.
 */
export function UsagePanel({ days, totals }: UsagePanelProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered === null ? totals : days[hovered];
  const t = useTranslations("AnalyticsPanels");
  const tHelp = useTranslations("AnalyticsHelp");
  const format = useFormatter();

  return (
    <>
      <StatRow mt="3" pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
        <Stat
          label={t("downloads")}
          help={tHelp("downloads")}
          value={format.number(Math.round(shown.requests))}
        />
        <Stat
          label={t("dataServed")}
          help={tHelp("served")}
          value={formatBytes(shown.bytes, 1)}
        />
        <Stat
          label={t("countries")}
          help={tHelp("countries")}
          value={format.number(shown.countries)}
        />
      </StatRow>

      <Flex mt="3" direction="column">
        <HoverCaption days={days} hovered={hovered} />
        <DownloadsChart
          days={days}
          hovered={hovered}
          onHover={setHovered}
          height={64}
        />
      </Flex>
    </>
  );
}
