"use client";

import { useState } from "react";
import { Flex, Tabs, Text } from "@radix-ui/themes";
import type { UsagePoint, UsageTotals, UsageUsers } from "@/lib/clients/analytics";
import { formatBytes } from "@/lib/format";
import {
  DownloadsChart,
  HELP,
  HoverCaption,
  mono,
  numberFormat,
  Stat,
  UsersContent,
} from "./panels";

// Kept here for its existing unit tests / import sites.
export { parseActiveIndex } from "./panels";

interface UsagePanelProps {
  days: UsagePoint[];
  totals: UsageTotals;
  users: UsageUsers;
}

/**
 * Compact analytics card panel (issue #257 mocks): DOWNLOADS tab with a
 * stats row (downloads, data served, countries) over a daily downloads bar
 * chart — hovering a bar shows that day's numbers — and a USERS tab with
 * registered vs anonymous usage and a download-frequency histogram.
 */
export function UsagePanel({ days, totals, users }: UsagePanelProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered === null ? totals : days[hovered];

  return (
    <Tabs.Root defaultValue="downloads">
      <Tabs.List size="1">
        <Tabs.Trigger value="downloads">
          <Text size="1" style={mono({ letterSpacing: "0.03em" })}>
            DOWNLOADS
          </Text>
        </Tabs.Trigger>
        <Tabs.Trigger value="users">
          <Text size="1" style={mono({ letterSpacing: "0.03em" })}>
            USERS
          </Text>
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="downloads">
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
      </Tabs.Content>

      <Tabs.Content value="users">
        <UsersContent users={users} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
