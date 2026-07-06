/**
 * Cloudflare Analytics Engine client for data-proxy request analytics.
 *
 * The data proxy (data.source.coop) writes one event per request with this
 * schema (see its src/analytics.rs):
 *
 *   blob1: account_id        blob6: country
 *   blob2: product_id        blob7: content_type
 *   blob3: file_path         blob8: client_ip_hash (empty if IP unknown)
 *   blob4: method            blob9: range header
 *   blob5: user_id           double1: bytes_sent
 *                            double2: status_code
 *                            double3: duration_ms
 *
 * Analytics Engine samples writes, so every count/sum must be weighted by
 * `_sample_interval`; COUNT(DISTINCT …) is the best available estimate for
 * uniques. It has no parameterized queries — every interpolated string goes
 * through sqlQuote(), and windows/buckets/columns come from whitelists only.
 *
 * Server-only: queries run over the SQL API with an account-level token.
 */
import { unstable_cache } from "next/cache";
import { CONFIG } from "@/lib/config";
import { LOGGER } from "@/lib/logging";

export const USAGE_DAYS = 28;

export interface UsageTotals {
  bytes: number;
  fullBytes: number; // status 200 (whole-object downloads)
  partialBytes: number; // status 206 (range requests)
  requests: number;
  visitors: number; // distinct client IP hashes
  countries: number;
}

export interface UsagePoint extends UsageTotals {
  /** ISO timestamp of the UTC day start */
  date: string;
}

export interface Usage {
  /** One point per UTC day, oldest first, zero-filled — always USAGE_DAYS long */
  days: UsagePoint[];
  totals: UsageTotals;
}

export const ADMIN_WINDOWS = {
  "24h": { label: "24 hours", hours: 24, bucketHours: 1 },
  "72h": { label: "72 hours", hours: 72, bucketHours: 3 },
  "1wk": { label: "1 week", hours: 7 * 24, bucketHours: 6 },
  "1mo": { label: "1 month", hours: 30 * 24, bucketHours: 24 },
  "3mo": { label: "3 months", hours: 90 * 24, bucketHours: 72 },
} as const;
export type AdminWindow = keyof typeof ADMIN_WINDOWS;

export const ADMIN_DIMENSIONS = {
  account: { label: "Account", columns: ["blob1"] },
  product: { label: "Product", columns: ["blob1", "blob2"] },
  country: { label: "Country", columns: ["blob6"] },
  client: { label: "Client", columns: ["blob8"] },
} as const;
export type AdminDimension = keyof typeof ADMIN_DIMENSIONS;

/**
 * How many series the stacked chart shows before folding into "Other" —
 * matches the fixed categorical palette size (hues are never cycled).
 */
const CHART_SERIES_LIMIT = 6;
/** How many rows the ranked totals table shows. */
const TABLE_GROUP_LIMIT = 25;
export const OTHER_KEY = "Other";

export interface AdminQuery {
  window: AdminWindow;
  groupBy: AdminDimension[];
  account?: string;
  product?: string;
}

export interface AdminBreakdown {
  /** ISO bucket-start timestamps, oldest first, zero-filled */
  buckets: string[];
  bucketHours: number;
  /** Chart series keys ranked by bytes desc; last may be OTHER_KEY */
  series: string[];
  /** Per bucket, bytes/requests per series key (absent key = zero) */
  points: Record<string, { bytes: number; requests: number }>[];
  /** Ranked totals for the table (top groups, then optionally OTHER_KEY) */
  groups: { key: string; bytes: number; requests: number }[];
  totals: { bytes: number; requests: number };
}

/**
 * Only count responses that actually served product bytes: HEAD responses
 * carry a Content-Length that the proxy logs as bytes_sent without a body,
 * and listing requests have no product segment (blob2 = '').
 */
const SERVED_FILTER = "blob4 = 'GET' AND double2 IN (200, 206) AND blob2 != ''";

export function isAnalyticsConfigured(): boolean {
  const { accountId, apiToken, dataset } = CONFIG.analytics;
  return Boolean(accountId && apiToken && dataset);
}

/** Quote a string for an Analytics Engine SQL literal (no parameterized queries exist). */
function sqlQuote(value: string): string {
  const cleaned = value
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
  return `'${cleaned}'`;
}

/**
 * Truncate to `maxBytes` UTF-8 bytes on a char boundary — mirrors the data
 * proxy's truncation of blob3, so filters match what was actually stored.
 */
function truncateToByteLimit(s: string, maxBytes: number): string {
  const bytes = new TextEncoder().encode(s);
  if (bytes.length <= maxBytes) return s;
  return new TextDecoder()
    .decode(bytes.slice(0, maxBytes))
    .replace(/�+$/, "");
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Parse an Analytics Engine DateTime ("2026-07-06 12:00:00") as UTC ISO. */
function parseDateTime(v: unknown): string {
  return new Date(`${str(v).replace(" ", "T")}Z`).toISOString();
}

type Row = Record<string, unknown>;

async function runQuery(sql: string): Promise<Row[]> {
  const { accountId, apiToken } = CONFIG.analytics;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: sql,
      // The Analytics Engine response is cached by the unstable_cache
      // wrappers below, not by the fetch data cache.
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(
      `Analytics Engine query failed (${res.status}): ${(await res.text()).slice(0, 500)}`,
    );
  }
  const body = (await res.json()) as { data?: Row[] };
  return body.data ?? [];
}

// unstable_cache includes the function arguments (the SQL string) in its key.
const usageQuery = unstable_cache(runQuery, ["analytics-usage"], {
  revalidate: 3600,
});
const adminQuery = unstable_cache(runQuery, ["analytics-admin"], {
  revalidate: 900,
});

const USAGE_AGGREGATES = `
  SUM(_sample_interval * double1) AS bytes,
  sumIf(_sample_interval * double1, double2 = 200) AS full_bytes,
  sumIf(_sample_interval * double1, double2 = 206) AS partial_bytes,
  SUM(_sample_interval) AS requests,
  COUNT(DISTINCT blob8) AS visitors,
  COUNT(DISTINCT blob6) AS countries`;

/**
 * 28-day usage for a product, or a single object when `objectPath` is given.
 * Returns null when analytics is unconfigured or the query fails — callers
 * render nothing rather than breaking the page.
 */
export async function getUsage(
  accountId: string,
  productId: string,
  objectPath?: string,
): Promise<Usage | null> {
  if (!isAnalyticsConfigured()) return null;

  const filters = [
    SERVED_FILTER,
    `blob1 = ${sqlQuote(accountId)}`,
    `blob2 = ${sqlQuote(productId)}`,
    `timestamp > NOW() - INTERVAL '${USAGE_DAYS}' DAY`,
  ];
  if (objectPath !== undefined) {
    filters.push(`blob3 = ${sqlQuote(truncateToByteLimit(objectPath, 256))}`);
  }
  const where = filters.join(" AND ");
  const from = `FROM ${CONFIG.analytics.dataset} WHERE ${where}`;

  try {
    const [seriesRows, totalsRows] = await Promise.all([
      usageQuery(
        `SELECT toStartOfDay(timestamp) AS day, ${USAGE_AGGREGATES} ${from} GROUP BY day ORDER BY day`,
      ),
      // Separate query: DISTINCT visitors/countries can't be summed from days.
      usageQuery(`SELECT ${USAGE_AGGREGATES} ${from}`),
    ]);

    const byDay = new Map(
      seriesRows.map((row) => [parseDateTime(row.day), row]),
    );
    const todayStart = new Date().setUTCHours(0, 0, 0, 0);
    const days: UsagePoint[] = Array.from({ length: USAGE_DAYS }, (_, i) => {
      const date = new Date(
        todayStart - (USAGE_DAYS - 1 - i) * 86_400_000,
      ).toISOString();
      const row = byDay.get(date) ?? {};
      return { date, ...parseUsageAggregates(row) };
    });

    return { days, totals: parseUsageAggregates(totalsRows[0] ?? {}) };
  } catch (error) {
    LOGGER.warn("Analytics usage query failed", {
      operation: "getUsage",
      context: "analytics engine",
      metadata: { accountId, productId, objectPath, error: String(error) },
    });
    return null;
  }
}

function parseUsageAggregates(row: Row): UsageTotals {
  return {
    bytes: num(row.bytes),
    fullBytes: num(row.full_bytes),
    partialBytes: num(row.partial_bytes),
    requests: num(row.requests),
    visitors: num(row.visitors),
    countries: num(row.countries),
  };
}

/** Display key for one grouped row, e.g. "ftw/global-data · US". */
function rowKey(row: Row, groupBy: AdminDimension[]): string {
  return groupBy
    .map((dim) => {
      switch (dim) {
        case "account":
          return str(row.blob1);
        case "product":
          return `${str(row.blob1)}/${str(row.blob2)}`;
        case "country":
          return str(row.blob6) || "(unknown)";
        case "client":
          // Full HMAC hex is unwieldy; 12 chars is plenty to tell clients apart.
          return str(row.blob8).slice(0, 12) || "(unknown)";
      }
    })
    .join(" · ");
}

/**
 * Traffic over a time window, bucketed for a stacked timeseries and grouped
 * by zero or more dimensions. Group cardinality is unbounded (client IP
 * hashes especially), so this never fetches all groups: a totals query finds
 * the top groups, the timeseries query is filtered to the chart's top slice,
 * and a bucket-totals query provides the "Other" remainder per bucket.
 *
 * Returns null when analytics is unconfigured; throws on query failure (the
 * admin page surfaces errors rather than hiding them).
 */
export async function getAdminBreakdown(
  query: AdminQuery,
): Promise<AdminBreakdown | null> {
  if (!isAnalyticsConfigured()) return null;

  const { hours, bucketHours } = ADMIN_WINDOWS[query.window];
  const groupBy = [...new Set(query.groupBy)];
  const filters = [
    SERVED_FILTER,
    `timestamp > NOW() - INTERVAL '${hours}' HOUR`,
  ];
  if (query.account) filters.push(`blob1 = ${sqlQuote(query.account)}`);
  if (query.product) filters.push(`blob2 = ${sqlQuote(query.product)}`);
  const from = `FROM ${CONFIG.analytics.dataset} WHERE ${filters.join(" AND ")}`;

  const aggregates = `SUM(_sample_interval * double1) AS bytes, SUM(_sample_interval) AS requests`;
  const bucketExpr = `toStartOfInterval(timestamp, INTERVAL '${bucketHours}' HOUR)`;

  // Per-bucket overall totals — the chart's "Other" baseline and grand total.
  const bucketTotalsSql = `SELECT ${bucketExpr} AS bucket, ${aggregates} ${from} GROUP BY bucket ORDER BY bucket`;

  const columns = [...new Set(groupBy.flatMap((d) => ADMIN_DIMENSIONS[d].columns))];
  const [bucketTotals, groupTotals] = await Promise.all([
    adminQuery(bucketTotalsSql),
    columns.length
      ? adminQuery(
          `SELECT ${columns.join(", ")}, ${aggregates} ${from} GROUP BY ${columns.join(", ")} ORDER BY bytes DESC LIMIT ${TABLE_GROUP_LIMIT}`,
        )
      : Promise.resolve([]),
  ]);

  const totals = {
    bytes: bucketTotals.reduce((sum, row) => sum + num(row.bytes), 0),
    requests: bucketTotals.reduce((sum, row) => sum + num(row.requests), 0),
  };

  // Zero-filled bucket grid, epoch-aligned like toStartOfInterval; union in
  // any returned bucket that lands off-grid so data is never dropped.
  const bucketMs = bucketHours * 3_600_000;
  const now = Date.now();
  const gridStart = Math.floor((now - hours * 3_600_000) / bucketMs) * bucketMs;
  const grid = new Set<string>();
  for (let t = gridStart; t <= now; t += bucketMs) {
    grid.add(new Date(t).toISOString());
  }
  for (const row of bucketTotals) grid.add(parseDateTime(row.bucket));
  const buckets = [...grid].sort();

  const totalByBucket = new Map(
    bucketTotals.map((row) => [parseDateTime(row.bucket), row]),
  );

  if (!columns.length) {
    // No grouping: a single "All traffic" series.
    const key = "All traffic";
    return {
      buckets,
      bucketHours,
      series: [key],
      points: buckets.map((b): AdminBreakdown["points"][number] => {
        const row = totalByBucket.get(b);
        return row ? { [key]: { bytes: num(row.bytes), requests: num(row.requests) } } : {};
      }),
      groups: totals.bytes || totals.requests ? [{ key, ...totals }] : [],
      totals,
    };
  }

  const groups = groupTotals.map((row) => ({
    key: rowKey(row, groupBy),
    bytes: num(row.bytes),
    requests: num(row.requests),
  }));

  // Timeseries only for the chart's top slice, matched on the raw columns.
  const chartRows = groupTotals.slice(0, CHART_SERIES_LIMIT);
  let seriesRows: Row[] = [];
  if (chartRows.length) {
    const match = chartRows
      .map(
        (row) =>
          `(${columns.map((c) => `${c} = ${sqlQuote(str(row[c]))}`).join(" AND ")})`,
      )
      .join(" OR ");
    seriesRows = await adminQuery(
      `SELECT ${bucketExpr} AS bucket, ${columns.join(", ")}, ${aggregates} ${from} AND (${match}) GROUP BY bucket, ${columns.join(", ")} ORDER BY bucket`,
    );
  }

  const chartKeys = chartRows.map((row) => rowKey(row, groupBy));
  const points: AdminBreakdown["points"] = buckets.map(() => ({}));
  const bucketIndex = new Map(buckets.map((b, i) => [b, i]));
  for (const row of seriesRows) {
    const i = bucketIndex.get(parseDateTime(row.bucket));
    if (i === undefined) continue;
    points[i][rowKey(row, groupBy)] = {
      bytes: num(row.bytes),
      requests: num(row.requests),
    };
  }

  // "Other" per bucket = overall minus the charted slice (clamped: sampling
  // estimates can put the slice a hair above the total).
  let otherBytes = 0;
  buckets.forEach((bucket, i) => {
    const total = totalByBucket.get(bucket);
    if (!total) return;
    const charted = Object.values(points[i]).reduce(
      (acc, v) => ({ bytes: acc.bytes + v.bytes, requests: acc.requests + v.requests }),
      { bytes: 0, requests: 0 },
    );
    const other = {
      bytes: Math.max(0, num(total.bytes) - charted.bytes),
      requests: Math.max(0, num(total.requests) - charted.requests),
    };
    if (other.bytes > 0 || other.requests > 0) {
      points[i][OTHER_KEY] = other;
      otherBytes += other.bytes;
    }
  });
  const series = otherBytes > 0 ? [...chartKeys, OTHER_KEY] : chartKeys;

  // Table remainder beyond the top TABLE_GROUP_LIMIT groups.
  const listedBytes = groups.reduce((sum, g) => sum + g.bytes, 0);
  const listedRequests = groups.reduce((sum, g) => sum + g.requests, 0);
  if (totals.bytes - listedBytes > 0) {
    groups.push({
      key: OTHER_KEY,
      bytes: totals.bytes - listedBytes,
      requests: Math.max(0, totals.requests - listedRequests),
    });
  }

  return { buckets, bucketHours, series, points, groups, totals };
}
