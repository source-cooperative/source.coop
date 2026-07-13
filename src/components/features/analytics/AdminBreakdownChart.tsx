"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Dialog,
  Flex,
  IconButton,
  SegmentedControl,
  Text,
} from "@radix-ui/themes";
import {
  CodeIcon,
  EnterFullScreenIcon,
  ExitFullScreenIcon,
} from "@radix-ui/react-icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBytes } from "@/lib/format";
import { mono } from "./panels";
import { seriesColor } from "./palette";

type Metric = "bytes" | "requests";

interface AdminBreakdownChartProps {
  buckets: string[];
  bucketHours: number;
  /** Inclusive UTC day range the data covers */
  range: { from: string; to: string };
  series: string[];
  points: Record<string, { bytes: number; requests: number }>[];
  totals: { bytes: number; requests: number };
  otherKey: string;
  /** From ?metric= so shared URLs reproduce the toggle state */
  initialMetric?: Metric;
  /** SQL executed for this view, shown in the "view SQL" dialog */
  queries?: string[];
}

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");

function tickLabel(iso: string, bucketHours: number): string {
  const d = new Date(iso);
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  // Sub-daily buckets need the time too; daily+ buckets always start at
  // 00:00 UTC, so the time would be noise.
  return bucketHours < 24
    ? `${day} ${String(d.getUTCHours()).padStart(2, "0")}:00`
    : day;
}

function bucketLabel(iso: string, bucketHours: number): string {
  const d = new Date(iso);
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return bucketHours < 24
    ? `${day} ${String(d.getUTCHours()).padStart(2, "0")}:00 UTC`
    : bucketHours > 24
      ? `${day} + ${bucketHours / 24 - 1}d`
      : day;
}

// en-US explicitly: this renders in SSR HTML, and locale-following
// toLocaleString() would hydrate differently for non-en visitors.
const compact = new Intl.NumberFormat("en-US", { notation: "compact" });
const plain = new Intl.NumberFormat("en-US");

function formatMetric(value: number, metric: Metric): string {
  return metric === "bytes" ? formatBytes(value) : compact.format(value);
}

/** Average request rate over one bucket, e.g. "~0.43/s". */
function requestRate(count: number, bucketHours: number): string {
  const perSec = count / (bucketHours * 3600);
  return `~${perSec >= 10 ? compact.format(perSec) : perSec.toFixed(2)}/s`;
}

/**
 * Stacked bar timeseries of traffic, one bar per time bucket, stacked by the
 * page's group-by series. Bytes/requests toggle is client-side — both metrics
 * ride in `points`, so switching never refetches.
 */
export function AdminBreakdownChart({
  buckets,
  bucketHours,
  range,
  series,
  points,
  totals,
  otherKey,
  initialMetric = "bytes",
  queries = [],
}: AdminBreakdownChartProps) {
  const [metric, setMetric] = useState<Metric>(initialMetric);

  // Native Fullscreen API on the chart block. Hidden where unsupported
  // (e.g. iPhone Safari).
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled));
    const onChange = () =>
      setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen();
  };

  // Both metrics are already in `points`, so the toggle never refetches —
  // but it lands in the URL (no server round-trip via replaceState) so the
  // page can be shared at its exact configuration.
  const changeMetric = (value: Metric) => {
    setMetric(value);
    const url = new URL(window.location.href);
    if (value === "requests") url.searchParams.set("metric", value);
    else url.searchParams.delete("metric");
    window.history.replaceState(null, "", url);
  };

  // Series keys are arbitrary strings (account/product names, hashes), so
  // rows use positional dataKeys that can't collide with "date".
  const rows = buckets.map((date, i) => ({
    date,
    ...Object.fromEntries(
      series.map((key, s) => [`s${s}`, points[i][key]?.[metric] ?? 0]),
    ),
  }));
  const colorAt = (s: number) => seriesColor(series[s], s, otherKey);

  return (
    <Box
      ref={rootRef}
      style={
        fullscreen
          ? {
              background: "var(--color-background)",
              padding: "var(--space-5)",
              display: "flex",
              flexDirection: "column",
              overflow: "auto",
            }
          : undefined
      }
    >
      <Flex justify="between" align="center" mb="3" gap="3" wrap="wrap">
        <Text size="1" color="gray" style={mono()}>
          {range.from} → {range.to}:{" "}
          <Text weight="bold" color="gray" highContrast>
            {metric === "bytes"
              ? formatBytes(totals.bytes)
              : plain.format(totals.requests)}
          </Text>{" "}
          {metric === "bytes" ? "served" : "requests"}
        </Text>
        <Flex gap="2" align="center">
          <SegmentedControl.Root
            size="1"
            value={metric}
            onValueChange={(value) => changeMetric(value as Metric)}
          >
            <SegmentedControl.Item value="bytes">Bytes</SegmentedControl.Item>
            <SegmentedControl.Item value="requests">
              Requests
            </SegmentedControl.Item>
          </SegmentedControl.Root>
          {queries.length > 0 && (
            <Dialog.Root>
              <Dialog.Trigger>
                <IconButton size="1" variant="soft" aria-label="View SQL">
                  <CodeIcon />
                </IconButton>
              </Dialog.Trigger>
              <Dialog.Content maxWidth="720px">
                <Dialog.Title size="3">Analytics Engine SQL</Dialog.Title>
                <Dialog.Description size="1" color="gray" mb="3">
                  The statements that produced this view, in execution order.
                </Dialog.Description>
                {queries.map((sql, i) => (
                  <Box
                    key={i}
                    p="2"
                    mb="2"
                    style={{
                      background: "var(--gray-2)",
                      border: "1px solid var(--gray-4)",
                      overflowX: "auto",
                    }}
                  >
                    <Text
                      as="div"
                      size="1"
                      style={{
                        fontFamily: "var(--code-font-family)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {sql}
                    </Text>
                  </Box>
                ))}
              </Dialog.Content>
            </Dialog.Root>
          )}
          {canFullscreen && (
            <IconButton
              size="1"
              variant="soft"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={toggleFullscreen}
            >
              {fullscreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
            </IconButton>
          )}
        </Flex>
      </Flex>

      <Box
        // Same as the card chart: keep clicks from moving focus (focus ring)
        // or starting a text selection on the SVG.
        onMouseDown={(event) => event.preventDefault()}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          ...(fullscreen && { flexGrow: 1, minHeight: 0 }),
        }}
      >
        <ResponsiveContainer width="100%" height={fullscreen ? "100%" : 320}>
        <BarChart
          data={rows}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="15%"
        >
          <CartesianGrid vertical={false} stroke="var(--gray-a4)" />
          <XAxis
            dataKey="date"
            tickFormatter={(iso: string) => tickLabel(iso, bucketHours)}
            tick={{ fill: "var(--gray-11)", fontSize: 11, fontFamily: "var(--code-font-family)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--gray-a6)" }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => formatMetric(value, metric)}
            tick={{ fill: "var(--gray-11)", fontSize: 11, fontFamily: "var(--code-font-family)" }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            cursor={{ fill: "var(--gray-a3)" }}
            isAnimationActive={false}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const entries = payload
                .map((entry) => ({
                  index: Number(String(entry.dataKey).slice(1)),
                  value: Number(entry.value) || 0,
                }))
                .filter((entry) => entry.value > 0)
                .sort((a, b) => b.value - a.value);
              const total = entries.reduce((sum, e) => sum + e.value, 0);
              return (
                <Box
                  p="2"
                  style={mono({
                    background: "var(--color-panel-solid)",
                    border: "1px solid var(--gray-6)",
                    boxShadow: "var(--shadow-3)",
                    maxWidth: 360,
                  })}
                >
                  <Text as="div" size="1" weight="bold" mb="1">
                    {bucketLabel(String(label), bucketHours)}
                  </Text>
                  {entries.map((entry) => (
                    <Flex key={entry.index} align="center" gap="2">
                      <Box
                        width="8px"
                        height="8px"
                        flexShrink="0"
                        style={{ background: colorAt(entry.index) }}
                      />
                      <Text
                        size="1"
                        truncate
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        {series[entry.index]}
                      </Text>
                      <Text size="1" weight="medium">
                        {formatMetric(entry.value, metric)}
                        {metric === "requests" && (
                          <Text color="gray">
                            {" "}
                            {requestRate(entry.value, bucketHours)}
                          </Text>
                        )}
                      </Text>
                    </Flex>
                  ))}
                  {entries.length > 1 && (
                    <Flex align="center" gap="2" mt="1">
                      <Box width="8px" flexShrink="0" />
                      <Text size="1" color="gray" style={{ flex: 1 }}>
                        Total
                      </Text>
                      <Text size="1" weight="bold">
                        {formatMetric(total, metric)}
                        {metric === "requests" && (
                          <Text color="gray" weight="regular">
                            {" "}
                            {requestRate(total, bucketHours)}
                          </Text>
                        )}
                      </Text>
                    </Flex>
                  )}
                </Box>
              );
            }}
          />
          {series.map((key, s) => (
            <Bar
              key={key}
              dataKey={`s${s}`}
              stackId="traffic"
              fill={colorAt(s)}
              stroke="var(--color-panel-solid)"
              strokeWidth={1}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
        </ResponsiveContainer>
      </Box>

      <Flex gap="3" mt="2" wrap="wrap">
        {series.map((key, s) => (
          <Flex key={key} align="center" gap="1">
            <Box
              width="10px"
              height="10px"
              flexShrink="0"
              style={{ background: colorAt(s) }}
            />
            <Text size="1" color="gray" style={mono()}>
              {key}
            </Text>
          </Flex>
        ))}
      </Flex>
      <Text as="div" size="1" color="gray" mt="2">
        Times are UTC. Values are estimates — Analytics Engine samples
        high-volume traffic.
      </Text>
    </Box>
  );
}
