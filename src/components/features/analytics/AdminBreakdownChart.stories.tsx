import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OTHER_KEY } from "@/lib/clients/analytics";
import { AdminBreakdownChart } from "./AdminBreakdownChart";

/**
 * The stacked traffic chart on `/admin/analytics` — the admin-only explorer.
 *
 * Seeing any of this in the app takes an admin session, a configured
 * Analytics Engine token, and enough real traffic to fill the range; changing
 * what it renders means editing the URL and waiting on a live query. The
 * states below are the ones that shape the chart, and each of them is a
 * different query away in the app: how many series survive before the rest
 * fold into "Other", how wide the buckets are, and which metric ranks them.
 *
 * Two behaviours are live here and worth trying. The **metric toggle** is
 * client state seeded from `?metric=`, so it switches bytes/requests without
 * a query. The **SQL dialog** opens whenever `queries` is non-empty.
 *
 * **Drill-down is not.** Clicking or dragging a bucket calls `router.push`
 * with a narrower range for the server to re-query — against Storybook's
 * mocked router that goes nowhere. The drag rectangle still tracks the
 * pointer, which is the part worth reviewing here; the navigation is not.
 */
const meta = {
  component: AdminBreakdownChart,
  title: "Features/Analytics/AdminBreakdownChart",
  parameters: { layout: "padded" },
  args: { otherKey: OTHER_KEY, initialMetric: "bytes" },
} satisfies Meta<typeof AdminBreakdownChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// Fixed, so tick labels do not move between two runs.
const RANGE_END = Date.UTC(2026, 7, 31);
const MINUTE_MS = 60_000;

const wobble = (i: number, seed = 0) =>
  (Math.sin(i * 1.7 + seed) + Math.sin(i * 0.41 + seed) + 2) / 4;

/** ISO bucket starts, oldest first, ending at RANGE_END. */
const makeBuckets = (count: number, bucketMinutes: number) =>
  Array.from({ length: count }, (_, i) =>
    new Date(
      RANGE_END - (count - i) * bucketMinutes * MINUTE_MS,
    ).toISOString(),
  );

/**
 * Per-bucket bytes/requests for each series. Series are ranked by total, so
 * each one gets a smaller share than the last — a flat split would hide
 * whether the stacking order is right. Absent keys mean zero in the real
 * shape, so a series that has fallen to nothing is simply left out.
 */
function makePoints(
  buckets: string[],
  series: string[],
  bytesPerRequest = 26_000_000,
): Record<string, { bytes: number; requests: number }>[] {
  return buckets.map((_, bucket) =>
    Object.fromEntries(
      series.flatMap((key, rank) => {
        const requests = Math.round(
          (900 / (rank + 1)) * (0.45 + wobble(bucket, rank * 3)),
        );
        if (requests === 0) return [];
        return [[key, { requests, bytes: requests * bytesPerRequest }]];
      }),
    ),
  );
}

const totalsOf = (
  points: Record<string, { bytes: number; requests: number }>[],
  uniqueIps: number,
  countries: number,
) => {
  const sum = (field: "bytes" | "requests") =>
    points.reduce(
      (acc, bucket) =>
        acc + Object.values(bucket).reduce((b, v) => b + v[field], 0),
      0,
    );
  return { bytes: sum("bytes"), requests: sum("requests"), uniqueIps, countries };
};

/** Whole-range wall clock, which is what the bandwidth stat divides by. */
const elapsed = (count: number, bucketMinutes: number) =>
  count * bucketMinutes * 60;

// Two products under `miskatonic` and two under `black-mesa`, because an
// account with one product tells you nothing about a view grouped by product.
const products = [
  "miskatonic/abyssal-acoustics",
  "black-mesa/anomalous-materials",
  "miskatonic/deep-sea-imagery",
  "acoltrane/coastal-lidar",
];

const dailyBuckets = makeBuckets(28, 1440);
const dailyPoints = makePoints(dailyBuckets, products);

/** Four products over 28 daily buckets — the view the page opens on. */
export const Default: Story = {
  args: {
    buckets: dailyBuckets,
    bucketMinutes: 1440,
    series: products,
    points: dailyPoints,
    totals: totalsOf(dailyPoints, 41_882, 96),
    elapsedSeconds: elapsed(28, 1440),
  },
};

// Six ranked series plus the folded remainder: the limit the palette is sized
// for, so this is the most colours the chart will ever show at once.
const foldedSeries = [
  ...products,
  "black-mesa/sector-c-telemetry",
  "mingus/harbor-bathymetry",
  OTHER_KEY,
];
const foldedPoints = makePoints(dailyBuckets, foldedSeries);

/**
 * More groups than the chart can colour, so everything past the top six is
 * summed into "Other". `seriesColor` gives that key a fixed grey rather than
 * the next hue in the palette — the thing to check is that the grey band sits
 * at the top of every stack and never borrows a series colour.
 */
export const WithOtherSeries: Story = {
  args: {
    buckets: dailyBuckets,
    bucketMinutes: 1440,
    series: foldedSeries,
    points: foldedPoints,
    totals: totalsOf(foldedPoints, 88_204, 143),
    elapsedSeconds: elapsed(28, 1440),
  },
};

const singleSeries = ["miskatonic/abyssal-acoustics"];
const singlePoints = makePoints(dailyBuckets, singleSeries);

/**
 * One group — what a filtered-down query leaves. Nothing stacks, so this is
 * where a stacked chart tends to look wrong for being technically correct.
 */
export const SingleSeries: Story = {
  args: {
    buckets: dailyBuckets,
    bucketMinutes: 1440,
    series: singleSeries,
    points: singlePoints,
    totals: totalsOf(singlePoints, 2_104, 28),
    elapsedSeconds: elapsed(28, 1440),
  },
};

const minuteBuckets = makeBuckets(120, 1);
const minutePoints = makePoints(minuteBuckets, products, 1_400_000);

/**
 * Minute buckets, the finest the explorer offers and the end of the drill-down
 * chain. Sub-daily buckets put a time on every tick label, and 120 bars is
 * dense enough to show whether the axis thins them sensibly.
 */
export const MinuteBuckets: Story = {
  args: {
    buckets: minuteBuckets,
    bucketMinutes: 1,
    series: products,
    points: minutePoints,
    totals: totalsOf(minutePoints, 1_890, 44),
    elapsedSeconds: elapsed(120, 1),
  },
};

const weeklyBuckets = makeBuckets(13, 10080);
const weeklyPoints = makePoints(weeklyBuckets, products, 620_000_000);

/**
 * Weekly buckets over a full retention window. Above daily, the tooltip label
 * gains a `+ 6d` span suffix rather than naming an end date — a quarter of
 * traffic in thirteen bars.
 */
export const WeeklyBuckets: Story = {
  args: {
    buckets: weeklyBuckets,
    bucketMinutes: 10080,
    series: products,
    points: weeklyPoints,
    totals: totalsOf(weeklyPoints, 214_660, 171),
    elapsedSeconds: elapsed(13, 10080),
  },
};

/**
 * Opened from a URL carrying `?metric=requests`, so the toggle starts on
 * requests. Ranking is by bytes either way, which is why the tall band is not
 * always the one on top here.
 */
export const RankedByRequests: Story = {
  args: {
    buckets: dailyBuckets,
    bucketMinutes: 1440,
    series: products,
    points: dailyPoints,
    totals: totalsOf(dailyPoints, 41_882, 96),
    elapsedSeconds: elapsed(28, 1440),
    initialMetric: "requests",
  },
};

/**
 * With the executed SQL attached, which is what puts the code button beside
 * the metric toggle. Two statements, because the timeseries and the ranked
 * totals are separate queries — and they are long, single-line, and the
 * dialog has to stay readable anyway.
 */
export const WithSql: Story = {
  name: "With SQL",
  args: {
    buckets: dailyBuckets,
    bucketMinutes: 1440,
    series: products,
    points: dailyPoints,
    totals: totalsOf(dailyPoints, 41_882, 96),
    elapsedSeconds: elapsed(28, 1440),
    queries: [
      "SELECT intDiv(toUInt32(timestamp), 86400) * 86400 AS bucket, concat(blob1, '/', blob2) AS key, sum(double1 * _sample_interval) AS bytes, sum(_sample_interval) AS requests FROM product_downloads WHERE timestamp >= toDateTime('2026-08-03 00:00:00') AND timestamp < toDateTime('2026-08-31 00:00:00') AND blob4 = 'GET' AND double2 IN (200.0, 206.0) AND blob2 != '' GROUP BY bucket, key ORDER BY bucket ASC FORMAT JSON",
      "SELECT concat(blob1, '/', blob2) AS key, sum(double1 * _sample_interval) AS bytes, sum(_sample_interval) AS requests FROM product_downloads WHERE timestamp >= toDateTime('2026-08-03 00:00:00') AND timestamp < toDateTime('2026-08-31 00:00:00') AND blob4 = 'GET' AND double2 IN (200.0, 206.0) AND blob2 != '' GROUP BY key ORDER BY bytes DESC LIMIT 25 FORMAT JSON",
    ],
  },
};
