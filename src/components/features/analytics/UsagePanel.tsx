"use client";

import { useState } from "react";
import { Box, Flex, Grid, Text } from "@radix-ui/themes";
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer } from "recharts";
import type { UsagePoint, UsageTotals } from "@/lib/clients/analytics";
import { formatBytes, formatDateSSR } from "@/lib/format";

interface UsagePanelProps {
  days: UsagePoint[];
  totals: UsageTotals;
  /** Products show served bytes; objects split full vs range downloads. */
  scope: "product" | "object";
}

/**
 * 28-day usage: a metrics grid over a daily bar chart. The latest bar is
 * highlighted green by default; hovering a bar highlights it and the grid
 * shows that day's numbers (per the issue #257 V1 mocks).
 */
export function UsagePanel({ days, totals, scope }: UsagePanelProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = hovered ?? days.length - 1;
  const shown = hovered === null ? totals : days[hovered];

  const metrics =
    scope === "product"
      ? [
          { label: "Data served", value: formatBytes(shown.bytes) },
          { label: "Unique visitors", value: shown.visitors.toLocaleString() },
          { label: "Countries", value: shown.countries.toLocaleString() },
        ]
      : [
          { label: "Full downloads", value: formatBytes(shown.fullBytes) },
          { label: "Range requests", value: formatBytes(shown.partialBytes) },
          { label: "Unique visitors", value: shown.visitors.toLocaleString() },
          { label: "Countries", value: shown.countries.toLocaleString() },
        ];

  return (
    <Box>
      <Flex align="center" gap="2" mb="2">
        {hovered !== null && (
          <Box
            width="8px"
            height="8px"
            style={{ background: "var(--green-9)", flexShrink: 0 }}
          />
        )}
        <Text size="1" color="gray">
          {hovered === null ? "Past 28 days" : formatDateSSR(days[hovered].date)}
        </Text>
      </Flex>

      <Grid columns={scope === "product" ? "3" : "2"} gapY="3" gapX="2" mb="3">
        {metrics.map((metric) => (
          <Box key={metric.label}>
            <Text as="div" size="4" weight="bold">
              {metric.value}
            </Text>
            <Text as="div" size="1" color="gray">
              {metric.label}
            </Text>
          </Box>
        ))}
      </Grid>

      <Box
        aria-label={`Daily data served over the past 28 days, totalling ${formatBytes(totals.bytes)}`}
        onMouseLeave={() => setHovered(null)}
      >
        <ResponsiveContainer width="100%" height={64}>
          <BarChart
            data={days}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={2}
            onMouseMove={(state) =>
              setHovered(
                typeof state?.activeTooltipIndex === "number"
                  ? state.activeTooltipIndex
                  : null,
              )
            }
          >
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Bar dataKey="bytes" isAnimationActive={false} minPointSize={2}>
              {days.map((day, i) => (
                <Cell
                  key={day.date}
                  fill={i === active ? "var(--green-9)" : "var(--gray-6)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <Flex justify="between" mt="1">
        <Text size="1" color="gray">
          {formatDateSSR(days[0].date)}
        </Text>
        <Text size="1" color="gray">
          {formatDateSSR(days[days.length - 1].date)}
        </Text>
      </Flex>
    </Box>
  );
}
