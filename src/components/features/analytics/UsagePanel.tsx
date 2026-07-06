"use client";

import { useState } from "react";
import { Box, Flex, Grid, Text, Tooltip } from "@radix-ui/themes";
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer } from "recharts";
import type { UsagePoint, UsageTotals } from "@/lib/clients/analytics";
import { formatBytes, formatDateSSR } from "@/lib/format";

interface UsagePanelProps {
  days: UsagePoint[];
  totals: UsageTotals;
  /** Products show served bytes; objects split full vs range downloads. */
  scope: "product" | "object";
}

// Deterministic across server and client — no-arg toLocaleString() follows
// the runtime locale and causes hydration mismatches.
const numberFormat = new Intl.NumberFormat("en-US");

/**
 * recharts 3 delivers activeTooltipIndex as a numeric string (or null);
 * older typings claim number. Accept either, bounded to the data.
 */
export function parseActiveIndex(raw: unknown, length: number): number | null {
  const index =
    typeof raw === "number" || (typeof raw === "string" && raw !== "")
      ? Number(raw) // Number("") would be 0, hence the guard above
      : NaN;
  return Number.isInteger(index) && index >= 0 && index < length ? index : null;
}

const HELP = {
  served:
    "Total bytes downloaded via successful GET requests, estimated from sampled request logs.",
  full: "Bytes served as complete file downloads (HTTP 200).",
  partial: "Bytes served as partial reads via Range requests (HTTP 206).",
  visitors:
    "Distinct clients, counted by a salted hash of the requester's IP address.",
  countries:
    "Distinct countries requests originated from, based on the requester's IP address.",
};

/**
 * 28-day usage: a metrics grid over a daily bar chart. Hovering a bar
 * highlights it green and the grid shows that day's numbers; otherwise no
 * bar is highlighted and the grid shows window totals (issue #257 V1 mocks).
 */
export function UsagePanel({ days, totals, scope }: UsagePanelProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered === null ? totals : days[hovered];

  const metrics =
    scope === "product"
      ? [
          // 1 decimal: wider values ("1016.72 GB") wrap and stretch the card
          { label: "Data served", value: formatBytes(shown.bytes, 1), help: HELP.served },
          { label: "Unique visitors", value: numberFormat.format(shown.visitors), help: HELP.visitors },
          { label: "Countries", value: numberFormat.format(shown.countries), help: HELP.countries },
        ]
      : [
          { label: "Full downloads", value: formatBytes(shown.fullBytes, 1), help: HELP.full },
          { label: "Range requests", value: formatBytes(shown.partialBytes, 1), help: HELP.partial },
          { label: "Unique visitors", value: numberFormat.format(shown.visitors), help: HELP.visitors },
          { label: "Countries", value: numberFormat.format(shown.countries), help: HELP.countries },
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
            <Tooltip content={metric.help}>
              <Text
                as="div"
                size="1"
                color="gray"
                style={{
                  width: "fit-content",
                  cursor: "help",
                  textDecorationLine: "underline",
                  textDecorationStyle: "dotted",
                  textDecorationColor: "var(--gray-8)",
                  textUnderlineOffset: "2px",
                }}
              >
                {metric.label}
              </Text>
            </Tooltip>
          </Box>
        ))}
      </Grid>

      <Box
        role="img"
        aria-label={`Daily data served over the past 28 days, totalling ${formatBytes(totals.bytes)}`}
        onMouseLeave={() => setHovered(null)}
      >
        <ResponsiveContainer width="100%" height={64}>
          <BarChart
            data={days}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={2}
            // The hover interaction is mouse-only; without a Tooltip the
            // default accessibility layer is just an inert tab stop. The
            // metrics grid above always carries the data.
            accessibilityLayer={false}
            onMouseMove={(state) =>
              setHovered(parseActiveIndex(state?.activeTooltipIndex, days.length))
            }
          >
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Bar dataKey="bytes" isAnimationActive={false} minPointSize={2}>
              {days.map((day, i) => (
                <Cell
                  key={day.date}
                  fill={i === hovered ? "var(--green-9)" : "var(--gray-6)"}
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
