"use client";

/**
 * Shared client-side pieces for the analytics card (UsagePanel) and the
 * product analytics page (ProductAnalyticsView).
 */
import { Box, Flex, Text, Tooltip } from "@radix-ui/themes";
import {
  BarChart,
  Bar,
  Cell,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
} from "recharts";
// Types only — a value import would drag the server data layer (CONFIG,
// LOGGER) into the client bundle.
import type { UsagePoint, UsageUsers } from "@/lib/clients/analytics";
import { formatDateSSR } from "@/lib/format";
import { HELP, mono } from "./style";

export { HELP, mono };

// Deterministic across server and client — no-arg toLocaleString() follows
// the runtime locale and causes hydration mismatches.
export const numberFormat = new Intl.NumberFormat("en-US");
export const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
});

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

export function MonoLabel({
  children,
  help,
}: {
  children: React.ReactNode;
  help?: string;
}) {
  const label = (
    <Text
      as="div"
      size="1"
      style={mono({
        textTransform: "uppercase",
        // Lighter and tighter than the default gray label (per mockups)
        letterSpacing: "0.03em",
        color: "var(--gray-10)",
        ...(help && { cursor: "help", width: "fit-content" }),
      })}
    >
      {children}
    </Text>
  );
  return help ? <Tooltip content={help}>{label}</Tooltip> : label;
}

export function Stat({
  label,
  help,
  value,
  divider,
}: {
  label: string;
  help: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <Box
      pl={divider ? "3" : "0"}
      style={{
        flexGrow: 1,
        ...(divider && { borderLeft: "1px solid var(--gray-4)" }),
      }}
    >
      <MonoLabel help={help}>{label}</MonoLabel>
      <Text
        as="div"
        size="3"
        weight="bold"
        mt="1"
        style={mono({ whiteSpace: "nowrap" })}
      >
        {value}
      </Text>
    </Box>
  );
}

/** Green swatch + "N-day downloads" caption, or the hovered day's date. */
export function HoverCaption({
  days,
  hovered,
}: {
  days: UsagePoint[];
  hovered: number | null;
}) {
  return (
    <Flex align="center" gap="2" mb="2">
      {hovered !== null && (
        <Box
          width="8px"
          height="8px"
          style={{ background: "var(--green-9)", flexShrink: 0 }}
        />
      )}
      <MonoLabel help={HELP.window}>
        {hovered === null
          ? `${days.length}-day downloads`
          : formatDateSSR(days[hovered].date)}
      </MonoLabel>
    </Flex>
  );
}

/** Daily downloads bars; hovering highlights a bar and reports its index. */
export function DownloadsChart({
  days,
  hovered,
  onHover,
  height,
}: {
  days: UsagePoint[];
  hovered: number | null;
  onHover: (index: number | null) => void;
  height: number;
}) {
  return (
    <Box
      role="img"
      aria-label={`Daily downloads over the past ${days.length} days`}
      onMouseLeave={() => onHover(null)}
      // Clicking the chart must not move focus (a click inside the Radix
      // tab panel otherwise promotes focus to it and draws its focus ring
      // around the panel). Keyboard focus is unaffected.
      onMouseDown={(event) => event.preventDefault()}
      // Clicking/dragging across the bars otherwise triggers the browser's
      // text-selection overlay on the SVG.
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={days}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barCategoryGap={2}
          // The hover interaction is mouse-only; without a Tooltip the
          // default accessibility layer is just an inert tab stop. The
          // stats row above always carries the data.
          accessibilityLayer={false}
          onMouseMove={(state) =>
            onHover(parseActiveIndex(state?.activeTooltipIndex, days.length))
          }
        >
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Bar dataKey="requests" isAnimationActive={false} minPointSize={2}>
            {days.map((day, i) => (
              <Cell
                key={day.date}
                fill={i === hovered ? "var(--green-9)" : "var(--gray-12)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Flex justify="between" mt="1">
        <MonoLabel>{formatDateSSR(days[0].date)}</MonoLabel>
        <MonoLabel>{formatDateSSR(days[days.length - 1].date)}</MonoLabel>
      </Flex>
    </Box>
  );
}

/** USERS tab body: unique IPs, registered vs anonymous usage, per-IP histogram. */
export function UsersContent({ users }: { users: UsageUsers }) {
  return (
    <>
      <Flex mt="3" pb="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
        <Stat
          label="Unique IPs"
          help={HELP.uniqueIps}
          value={numberFormat.format(users.uniqueIps)}
        />
        <Stat
          label="Registered"
          help={HELP.registered}
          value={numberFormat.format(users.registered)}
          divider
        />
        <Stat
          label="Anon requests"
          help={HELP.anon}
          value={`~${compactFormat.format(Math.round(users.anonRequests)).toLowerCase()}`}
          divider
        />
      </Flex>

      <Box mt="3">
        <MonoLabel help={HELP.distribution}>IPs by download count</MonoLabel>
        {users.uniqueIps === 0 ? (
          <Text as="div" size="1" color="gray" mt="2">
            No download activity in this period.
          </Text>
        ) : (
          <Box mt="2">
            <DistributionChart distribution={users.distribution} />
          </Box>
        )}
      </Box>
    </>
  );
}

/**
 * Pareto-style chart of the per-IP population: quasi-log downloads-per-IP
 * bins in their natural order (bars), with a line accumulating "IPs with
 * this many downloads or fewer" toward the total. Single axis: the line
 * accumulates IP counts, not a second percent scale; tooltips carry the
 * percentage. Bins stay ordinal — ranking them by size would shuffle an
 * ordered scale.
 */
function DistributionChart({
  distribution,
}: {
  distribution: UsageUsers["distribution"];
}) {
  const total = distribution.reduce((sum, bin) => sum + bin.ips, 0);
  // Trim trailing empty bins (a sparse product would waste half the axis);
  // interior zeros stay — they are part of the distribution's shape.
  let end = 0;
  distribution.forEach((bin, i) => {
    if (bin.ips > 0) end = i + 1;
  });
  let running = 0;
  const data = distribution.slice(0, end).map((bin) => {
    running += bin.ips;
    return { ...bin, cumulative: running, share: running / Math.max(1, total) };
  });
  return (
    <Box
      role="img"
      aria-label="Pareto chart of unique IPs by downloads per IP"
      onMouseDown={(event) => event.preventDefault()}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          barCategoryGap={1}
          accessibilityLayer={false}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--gray-11)", fontSize: 10, fontFamily: "var(--code-font-family)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--gray-a6)" }}
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--gray-11)", fontSize: 10, fontFamily: "var(--code-font-family)" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <ChartTooltip
            cursor={{ fill: "var(--gray-a3)" }}
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as {
                ips: number;
                share: number;
              };
              return (
                <Box
                  p="2"
                  style={mono({
                    background: "var(--color-panel-solid)",
                    border: "1px solid var(--gray-6)",
                    boxShadow: "var(--shadow-3)",
                  })}
                >
                  <Text as="div" size="1">
                    {numberFormat.format(row.ips)} IPs · {label} downloads
                  </Text>
                  <Text as="div" size="1" color="gray">
                    {(row.share * 100).toFixed(0)}% of IPs at or below this
                  </Text>
                </Box>
              );
            }}
          />
          <Bar dataKey="ips" fill="var(--gray-12)" isAnimationActive={false} />
          <Line
            dataKey="cumulative"
            stroke="var(--green-9)"
            strokeWidth={2}
            dot={{ r: 2, fill: "var(--green-9)", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <Flex gap="3" mt="1">
        <Flex align="center" gap="1">
          <Box
            width="8px"
            height="8px"
            flexShrink="0"
            style={{ background: "var(--gray-12)" }}
          />
          <Text size="1" color="gray" style={mono()}>
            IPs
          </Text>
        </Flex>
        <Flex align="center" gap="1">
          <Box
            width="8px"
            height="2px"
            flexShrink="0"
            style={{ background: "var(--green-9)" }}
          />
          <Text size="1" color="gray" style={mono()}>
            cumulative
          </Text>
        </Flex>
      </Flex>
    </Box>
  );
}
