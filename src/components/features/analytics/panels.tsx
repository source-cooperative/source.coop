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
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { UsagePoint, UsageUsers } from "@/lib/clients/analytics";
import { formatDateSSR } from "@/lib/format";

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

export const HELP = {
  downloads: "Number of successful downloads.",
  served: "Total bytes downloaded.",
  countries: "Distinct countries requests originated from.",
  dailyAvg: "Average downloads per day over the period.",
  uniqueIps: "Distinct IP addresses that downloaded data in this period.",
  registered: "Distinct signed-in users who downloaded data in this period.",
  anon: "Download requests made without a signed-in user.",
  frequency:
    "How many times each unique IP address downloaded data in this period.",
};

export const mono = (extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: "var(--code-font-family)",
  ...extra,
});

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
      <MonoLabel>
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

/** USERS tab body: unique IPs, registered vs anonymous usage, per-IP frequency. */
export function UsersContent({ users }: { users: UsageUsers }) {
  const maxFrequency = Math.max(1, users.uniqueIps);
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
        <MonoLabel help={HELP.frequency}>
          Unique IPs · Download frequency
        </MonoLabel>
        {users.uniqueIps === 0 ? (
          <Text as="div" size="1" color="gray" mt="2">
            No download activity in this period.
          </Text>
        ) : (
          <Box mt="2">
            {users.frequency.map(({ label, count }) => (
              <Flex key={label} align="center" gap="2" mb="2">
                <Text size="1" style={mono({ width: 42, flexShrink: 0 })}>
                  {label}
                </Text>
                <Box
                  height="10px"
                  style={{ flexGrow: 1, background: "var(--gray-4)" }}
                >
                  <Box
                    height="10px"
                    style={{
                      width: `${(count / maxFrequency) * 100}%`,
                      background: "var(--gray-12)",
                    }}
                  />
                </Box>
                <Text
                  size="1"
                  color="gray"
                  style={mono({ width: 40, flexShrink: 0, textAlign: "right" })}
                >
                  {numberFormat.format(count)}
                </Text>
              </Flex>
            ))}
          </Box>
        )}
      </Box>
    </>
  );
}
