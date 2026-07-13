"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBytes } from "@/lib/format";
import { parseActiveIndex, Stat } from "./panels";
import { HELP, mono } from "./style";
import { seriesColor } from "./palette";

type Metric = "bytes" | "requests";

interface AdminBreakdownChartProps {
  buckets: string[];
  bucketMinutes: number;
  series: string[];
  points: Record<string, { bytes: number; requests: number }>[];
  totals: {
    bytes: number;
    requests: number;
    uniqueIps: number;
    countries: number;
  };
  /** Elapsed wall-clock seconds within the range, for the bandwidth stat */
  elapsedSeconds: number;
  otherKey: string;
  /** From ?metric= so shared URLs reproduce the toggle state */
  initialMetric?: Metric;
  /** SQL executed for this view, shown in the "view SQL" dialog */
  queries?: string[];
}

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const DAY_MIN = 1440;
const DAY_MS = 86_400_000;

const hhmm = (d: Date) =>
  `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

function tickLabel(iso: string, bucketMinutes: number): string {
  const d = new Date(iso);
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  // Sub-daily buckets need the time too; daily+ buckets always start at
  // 00:00 UTC, so the time would be noise.
  return bucketMinutes < DAY_MIN ? `${day} ${hhmm(d)}` : day;
}

function bucketLabel(iso: string, bucketMinutes: number): string {
  const d = new Date(iso);
  const day = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return bucketMinutes < DAY_MIN
    ? `${day} ${hhmm(d)} UTC`
    : bucketMinutes > DAY_MIN
      ? `${day} + ${bucketMinutes / DAY_MIN - 1}d`
      : day;
}

/**
 * Zooming in: the interval shown after drilling into one bucket of a given
 * size — weeks break into days, days into hours, hours into minutes.
 */
const DRILL_INTERVAL: Record<number, number> = {
  10080: 1440,
  4320: 1440,
  1440: 60,
  360: 60,
  180: 60,
  60: 1,
  15: 1,
  1: 1,
};

// en-US explicitly: this renders in SSR HTML, and locale-following
// toLocaleString() would hydrate differently for non-en visitors.
const compact = new Intl.NumberFormat("en-US", { notation: "compact" });
const plain = new Intl.NumberFormat("en-US");

function formatMetric(value: number, metric: Metric): string {
  return metric === "bytes" ? formatBytes(value) : compact.format(value);
}

/** formatBytes chokes on sub-1 values (negative log); pin those to bytes. */
const byteRate = (perSec: number) =>
  `${perSec > 0 && perSec < 1 ? `${perSec.toFixed(2)} B` : formatBytes(perSec, 1)}/s`;

/** Average rate over one bucket: "~0.43/s" requests, "~12.3 MB/s" bytes. */
function rate(value: number, bucketMinutes: number, metric: Metric): string {
  const perSec = value / (bucketMinutes * 60);
  return metric === "bytes"
    ? `~${byteRate(perSec)}`
    : `~${perSec >= 10 ? compact.format(perSec) : perSec.toFixed(2)}/s`;
}

/**
 * Stacked bar timeseries of traffic, one bar per time bucket, stacked by the
 * page's group-by series. Bytes/requests toggle is client-side — both metrics
 * ride in `points`, so switching never refetches.
 */
export function AdminBreakdownChart({
  buckets,
  bucketMinutes,
  series,
  points,
  totals,
  elapsedSeconds,
  otherKey,
  initialMetric = "bytes",
  queries = [],
}: AdminBreakdownChartProps) {
  const [metric, setMetric] = useState<Metric>(initialMetric);
  const router = useRouter();

  // Click/drag drill-down: a click narrows the range to that bucket, a drag
  // to the spanned buckets, both at the next finer interval. router.push
  // adds a history entry, so the browser back button zooms out.
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);
  const drillTo = (i0: number, i1: number) => {
    const lo = Math.min(i0, i1);
    const hi = Math.max(i0, i1);
    // A single minute bucket has nothing finer to show.
    if (bucketMinutes === 1 && lo === hi) return;
    const startMs = Date.parse(buckets[lo]);
    const endMs = Date.parse(buckets[hi]) + bucketMinutes * 60_000;
    const url = new URL(window.location.href);
    if (startMs % DAY_MS === 0 && endMs % DAY_MS === 0) {
      // Whole days: keep the friendlier inclusive-day param form.
      url.searchParams.set("from", buckets[lo].slice(0, 10));
      url.searchParams.set(
        "to",
        new Date(endMs - DAY_MS).toISOString().slice(0, 10),
      );
    } else {
      url.searchParams.set("from", buckets[lo].slice(0, 16));
      url.searchParams.set("to", new Date(endMs).toISOString().slice(0, 16));
    }
    url.searchParams.set(
      "interval",
      String(DRILL_INTERVAL[bucketMinutes] ?? bucketMinutes),
    );
    router.push(url.pathname + url.search);
  };
  const activeAt = (state: { activeTooltipIndex?: unknown } | null) =>
    parseActiveIndex(state?.activeTooltipIndex, buckets.length);

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
      <Flex
        justify="between"
        align="center"
        mb="4"
        pb="3"
        gap="4"
        wrap="wrap"
        style={{ borderBottom: "1px solid var(--gray-4)" }}
      >
        <Flex style={{ flexGrow: 1 }}>
          <Stat
            label="Requests"
            help={HELP.requests}
            value={plain.format(Math.round(totals.requests))}
          />
          <Stat
            label="Data served"
            help={HELP.served}
            value={formatBytes(totals.bytes, 1)}
            divider
          />
          <Stat
            label="Avg bandwidth"
            help={HELP.bandwidth}
            value={byteRate(totals.bytes / elapsedSeconds)}
            divider
          />
          <Stat
            label="Unique IPs"
            help={HELP.uniqueIps}
            value={plain.format(totals.uniqueIps)}
            divider
          />
          <Stat
            label="Countries"
            help={HELP.countries}
            value={plain.format(totals.countries)}
            divider
          />
        </Flex>
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
          cursor: "crosshair",
          ...(fullscreen && { flexGrow: 1, minHeight: 0 }),
        }}
      >
        <ResponsiveContainer width="100%" height={fullscreen ? "100%" : 320}>
        <BarChart
          data={rows}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="15%"
          onMouseDown={(state) => {
            const i = activeAt(state);
            if (i !== null) setDrag({ start: i, end: i });
          }}
          onMouseMove={(state) => {
            if (!drag) return;
            const i = activeAt(state);
            if (i !== null && i !== drag.end) setDrag({ ...drag, end: i });
          }}
          onMouseUp={() => {
            if (drag) drillTo(drag.start, drag.end);
            setDrag(null);
          }}
          onMouseLeave={() => setDrag(null)}
        >
          <CartesianGrid vertical={false} stroke="var(--gray-a4)" />
          <XAxis
            dataKey="date"
            tickFormatter={(iso: string) => tickLabel(iso, bucketMinutes)}
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
                    {bucketLabel(String(label), bucketMinutes)}
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
                        <Text color="gray">
                          {" "}
                          {rate(entry.value, bucketMinutes, metric)}
                        </Text>
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
                        <Text color="gray" weight="regular">
                          {" "}
                          {rate(total, bucketMinutes, metric)}
                        </Text>
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
          {drag && drag.start !== drag.end && (
            <ReferenceArea
              x1={buckets[Math.min(drag.start, drag.end)]}
              x2={buckets[Math.max(drag.start, drag.end)]}
              fill="var(--gray-a5)"
              stroke="var(--gray-8)"
            />
          )}
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
        high-volume traffic. Click a bar (or drag across several) to zoom in;
        the browser back button zooms out.
      </Text>
    </Box>
  );
}
