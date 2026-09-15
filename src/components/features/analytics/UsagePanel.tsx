"use client";

import { useState } from "react";
import { Code, Flex, Text, Tooltip } from "@radix-ui/themes";
import type { UsagePoint, UsageTotals } from "@/lib/clients/analytics";
import { formatBytes } from "@/lib/format";
import {
  DownloadsChart,
  HELP,
  HoverCaption,
  numberFormat,
  Stat,
  StatRow,
} from "./panels";

// Kept here for its existing unit tests / import sites.
export { parseActiveIndex } from "./panels";

interface UsagePanelProps {
  days: UsagePoint[];
  totals: UsageTotals;
  /** Path the numbers cover; omitted/empty means the whole product */
  prefix?: string;
}

/**
 * Compact analytics card panel (issue #257 mocks): a stats row (downloads,
 * data served, countries) over a daily downloads bar chart — hovering a bar
 * shows that day's numbers. Users/audience detail lives on the full
 * analytics page, not in the card.
 *
 * With a `prefix`, the numbers cover that path rather than the whole
 * product, and the path is named above them — the same figures under two
 * different scopes are otherwise indistinguishable.
 */
export function UsagePanel({ days, totals, prefix }: UsagePanelProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered === null ? totals : days[hovered];
  // One trailing slash, however the URL spelled the path: `docs/` reads as
  // everything under docs, where a bare `docs` reads as one object.
  const scope = prefix && `${prefix.replace(/\/+$/, "")}/`;

  return (
    <>
      {scope && (
        <Tooltip content="These numbers cover this path and everything under it.">
          {/* A path is one unbreakable token, so a deep one truncates to the
              line, with the full value in the title, as a DOI does. The
              truncation lives on the block Text: on the inline Code it would
              have no width to work against, and the path would simply run
              off the side of the card. */}
          <Text as="div" size="1" mt="2" truncate title={scope}>
            <Code color="gray" variant="ghost">
              {scope}
            </Code>
          </Text>
        </Tooltip>
      )}

      <StatRow mt="3" pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
        <Stat
          label="Downloads"
          help={HELP.downloads}
          value={numberFormat.format(Math.round(shown.requests))}
        />
        <Stat
          label="Data served"
          help={HELP.served}
          value={formatBytes(shown.bytes, 1)}
        />
        <Stat
          label="Countries"
          help={HELP.countries}
          value={numberFormat.format(shown.countries)}
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
