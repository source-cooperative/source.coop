"use client";

import { useState } from "react";
import { Flex } from "@radix-ui/themes";
import type { UsagePoint, UsageTotals } from "@/lib/clients/analytics";
import { formatBytes } from "@/lib/format";
import {
  DownloadsChart,
  HELP,
  HoverCaption,
  numberFormat,
  Stat,
} from "./panels";

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

  return (
    <>
      <Flex mt="3" pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
        <Stat
          label="Downloads"
          help={HELP.downloads}
          value={numberFormat.format(Math.round(shown.requests))}
        />
        <Stat
          label="Data served"
          help={HELP.served}
          value={formatBytes(shown.bytes, 1)}
          divider
        />
        <Stat
          label="Countries"
          help={HELP.countries}
          value={numberFormat.format(shown.countries)}
          divider
        />
      </Flex>

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
