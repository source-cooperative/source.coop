"use client";

import { useState } from "react";
import { Box, Flex, Tabs, Text, Tooltip } from "@radix-ui/themes";
import { BarChart, Bar, Cell, XAxis, YAxis, ResponsiveContainer } from "recharts";
import type { UsagePoint, UsageTotals, UsageUsers } from "@/lib/clients/analytics";
import { formatBytes, formatDateSSR } from "@/lib/format";

interface UsagePanelProps {
  days: UsagePoint[];
  totals: UsageTotals;
  users: UsageUsers;
}

// Deterministic across server and client — no-arg toLocaleString() follows
// the runtime locale and causes hydration mismatches.
const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact" });

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
  downloads:
    "Number of successful download requests (GET), estimated from sampled logs.",
  served:
    "Total bytes downloaded via successful GET requests, estimated from sampled request logs.",
  countries:
    "Distinct countries requests originated from, based on the requester's IP address.",
  registered: "Distinct signed-in users who downloaded data in this period.",
  anon: "Download requests made without a signed-in user (approximate).",
  frequency:
    "How many times each registered user downloaded data in this period.",
};

const mono = (extra?: React.CSSProperties): React.CSSProperties => ({
  fontFamily: "var(--code-font-family)",
  ...extra,
});

function MonoLabel({
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
      color="gray"
      style={mono({
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        ...(help && { cursor: "help", width: "fit-content" }),
      })}
    >
      {children}
    </Text>
  );
  return help ? <Tooltip content={help}>{label}</Tooltip> : label;
}

function Stat({
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

/**
 * Product/object analytics panel (issue #257 mocks): DOWNLOADS tab with a
 * stats row (downloads, data served, countries) over a daily downloads bar
 * chart — hovering a bar shows that day's numbers — and a USERS tab with
 * registered vs anonymous usage and a download-frequency histogram.
 */
export function UsagePanel({ days, totals, users }: UsagePanelProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered === null ? totals : days[hovered];
  const maxFrequency = Math.max(1, users.registered);

  return (
    <Tabs.Root defaultValue="downloads">
      <Tabs.List size="1">
        <Tabs.Trigger value="downloads">
          <Text size="1" style={mono({ letterSpacing: "0.08em" })}>
            DOWNLOADS
          </Text>
        </Tabs.Trigger>
        <Tabs.Trigger value="users">
          <Text size="1" style={mono({ letterSpacing: "0.08em" })}>
            USERS
          </Text>
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="downloads">
        <Flex
          mt="3"
          pb="3"
          style={{ borderBottom: "1px solid var(--gray-4)" }}
        >
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

        <Flex align="center" gap="2" mt="3" mb="2">
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
        <Box
          role="img"
          aria-label={`Daily downloads over the past ${days.length} days, totalling ${numberFormat.format(Math.round(totals.requests))}`}
          onMouseLeave={() => setHovered(null)}
        >
          <ResponsiveContainer width="100%" height={64}>
            <BarChart
              data={days}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              barCategoryGap={2}
              // The hover interaction is mouse-only; without a Tooltip the
              // default accessibility layer is just an inert tab stop. The
              // stats row above always carries the data.
              accessibilityLayer={false}
              onMouseMove={(state) =>
                setHovered(parseActiveIndex(state?.activeTooltipIndex, days.length))
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
        </Box>
        <Flex justify="between" mt="1">
          <MonoLabel>{formatDateSSR(days[0].date)}</MonoLabel>
          <MonoLabel>{formatDateSSR(days[days.length - 1].date)}</MonoLabel>
        </Flex>
      </Tabs.Content>

      <Tabs.Content value="users">
        <Flex
          mt="3"
          pb="3"
          style={{ borderBottom: "1px solid var(--gray-4)" }}
        >
          <Stat
            label="Registered"
            help={HELP.registered}
            value={numberFormat.format(users.registered)}
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
            Registered · Download frequency
          </MonoLabel>
          {users.registered === 0 ? (
            <Text as="div" size="1" color="gray" mt="2">
              No downloads from signed-in users in this period.
            </Text>
          ) : (
            <Box mt="2">
              {users.frequency.map(({ label, count }) => (
                <Flex key={label} align="center" gap="2" mb="2">
                  <Text
                    size="1"
                    style={mono({ width: 42, flexShrink: 0 })}
                  >
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
                    style={mono({
                      width: 40,
                      flexShrink: 0,
                      textAlign: "right",
                    })}
                  >
                    {numberFormat.format(count)}
                  </Text>
                </Flex>
              ))}
            </Box>
          )}
        </Box>
      </Tabs.Content>
    </Tabs.Root>
  );
}
