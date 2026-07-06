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
import { withTimeout } from "@/lib/with-timeout";

export const USAGE_DAYS = 30;

/** Windows offered on the product analytics page (bounded by AE retention). */
export const USAGE_WINDOWS = [7, 30, 90] as const;
export type UsageWindow = (typeof USAGE_WINDOWS)[number];

export interface UsageTotals {
  bytes: number;
  requests: number; // downloads: successful GETs, sample-weighted
  countries: number;
}

export interface UsagePoint extends UsageTotals {
  /** ISO timestamp of the UTC day start */
  date: string;
}

/** Download-frequency histogram buckets for registered users. */
export const FREQUENCY_BUCKETS = [
  { label: "1×", max: 1 },
  { label: "2–5×", max: 5 },
  { label: "6–20×", max: 20 },
  { label: "20×+", max: Infinity },
] as const;

export interface UsageUsers {
  /** Distinct signed-in users (blob5) that downloaded in the window */
  registered: number;
  /** Sample-weighted requests with no signed-in user */
  anonRequests: number;
  /** Per-FREQUENCY_BUCKETS count of registered users */
  frequency: { label: string; count: number }[];
}

export interface Usage {
  /** One point per UTC day, oldest first, zero-filled — always USAGE_DAYS long */
  days: UsagePoint[];
  totals: UsageTotals;
  users: UsageUsers;
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
  // "IP hash", not "Client" — client reads as the client_id/User-Agent header
  client: { label: "IP hash", columns: ["blob8"] },
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
 *
 * Float literals are load-bearing: AE's type checker rejects comparing the
 * Double column double2 against Integer literals (422 "IN expression types
 * must be consistent").
 */
const SERVED_FILTER =
  "blob4 = 'GET' AND double2 IN (200.0, 206.0) AND blob2 != ''";

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
  // withTimeout: a hung Analytics Engine API must not hold the page's
  // Suspense boundary (and the serverless invocation) open indefinitely.
  const res = await withTimeout(
    fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}` },
        body: sql,
        // The Analytics Engine response is cached by the unstable_cache
        // wrappers below, not by the fetch data cache.
        cache: "no-store",
      },
    ),
    15_000,
    "Analytics Engine query timed out",
  );
  if (!res.ok) {
    throw new Error(
      `Analytics Engine query failed (${res.status}): ${(await res.text()).slice(0, 500)}`,
    );
  }
  const body = (await res.json()) as { data?: Row[] };
  return body.data ?? [];
}

// unstable_cache includes the function arguments (the SQL string) in its key,
// so each (account, product, object, window) caches independently.
//
// Product/object stats are non-dynamic — 30-day aggregates barely move, so
// they rerun at most every 4 hours. The admin explorer is an interactive
// surface with a 24h window, so it stays comparatively fresh.
const usageQuery = unstable_cache(runQuery, ["analytics-usage"], {
  revalidate: 4 * 3600,
});
const adminQuery = unstable_cache(runQuery, ["analytics-admin"], {
  revalidate: 900,
});

const USAGE_AGGREGATES = `
  SUM(_sample_interval * double1) AS bytes,
  SUM(_sample_interval) AS requests,
  COUNT(DISTINCT blob6) AS countries`;

/**
 * Shared FROM/WHERE for the usage queries. AE's SQL validator is strict
 * (see SERVED_FILTER); stick to the documented NOW() - INTERVAL form. The
 * window touches one more UTC calendar day than the day grid — alignment
 * happens in JS, where off-grid rows are dropped and displayed totals are
 * summed from the grid days.
 */
function usageFrom(
  accountId: string,
  productId: string,
  objectPath: string | undefined,
  days: UsageWindow,
): string {
  const filters = [
    SERVED_FILTER,
    `timestamp > NOW() - INTERVAL '${days}' DAY`,
    `blob1 = ${sqlQuote(accountId)}`,
    `blob2 = ${sqlQuote(productId)}`,
  ];
  if (objectPath !== undefined) {
    filters.push(`blob3 = ${sqlQuote(truncateToByteLimit(objectPath, 256))}`);
  }
  return `FROM ${CONFIG.analytics.dataset} WHERE ${filters.join(" AND ")}`;
}

/**
 * Recent usage (USAGE_DAYS) for a product, or a single object when `objectPath` is given.
 * Returns null when analytics is unconfigured or the query fails — callers
 * render nothing rather than breaking the page.
 */
export async function getUsage(
  accountId: string,
  productId: string,
  objectPath?: string,
  days: UsageWindow = USAGE_DAYS,
): Promise<Usage | null> {
  if (!isAnalyticsConfigured()) return null;

  const from = usageFrom(accountId, productId, objectPath, days);

  try {
    const [seriesRows, windowRows, userRows] = await Promise.all([
      usageQuery(
        `SELECT toStartOfDay(timestamp) AS day, ${USAGE_AGGREGATES} ${from} GROUP BY day ORDER BY day`,
      ),
      // Separate query: window-wide DISTINCT can't be summed from days.
      usageQuery(
        `SELECT COUNT(DISTINCT blob6) AS countries, sumIf(_sample_interval, blob5 = '') AS anon_requests ${from}`,
      ),
      // Sample-weighted request count per signed-in user, for the
      // download-frequency histogram. Registered = number of rows.
      usageQuery(
        `SELECT blob5 AS user, SUM(_sample_interval) AS requests ${from} AND blob5 != '' GROUP BY user`,
      ),
    ]);

    const byDay = new Map(
      seriesRows.map((row) => [parseDateTime(row.day), row]),
    );
    const todayStart = new Date().setUTCHours(0, 0, 0, 0);
    const points: UsagePoint[] = Array.from({ length: days }, (_, i) => {
      const date = new Date(
        todayStart - (days - 1 - i) * 86_400_000,
      ).toISOString();
      const row = byDay.get(date) ?? {};
      return { date, ...parseUsageAggregates(row) };
    });

    // Additive totals come from the grid days, so bars and headline always
    // agree; the extra (off-grid) partial day the SQL window touches is
    // dropped with them. The uniques keep that sliver — they're estimates.
    const totals = points.reduce(
      (acc, day) => ({
        bytes: acc.bytes + day.bytes,
        requests: acc.requests + day.requests,
        countries: acc.countries,
      }),
      { bytes: 0, requests: 0, countries: num(windowRows[0]?.countries) },
    );

    const frequency = FREQUENCY_BUCKETS.map(({ label }) => ({
      label,
      count: 0,
    }));
    for (const row of userRows) {
      // Sampling makes per-user counts fractional estimates; round, floor 1.
      const downloads = Math.max(1, Math.round(num(row.requests)));
      frequency[
        FREQUENCY_BUCKETS.findIndex((bucket) => downloads <= bucket.max)
      ].count += 1;
    }

    return {
      days: points,
      totals,
      users: {
        registered: userRows.length,
        anonRequests: num(windowRows[0]?.anon_requests),
        frequency,
      },
    };
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
    requests: num(row.requests),
    countries: num(row.countries),
  };
}

const COUNTRY_LIST_LIMIT = 5;
const FILE_LIST_LIMIT = 10;

export interface ProductBreakdowns {
  /** Top countries by downloads */
  countries: { code: string; name: string; requests: number }[];
  /** Aggregate of the remaining countries, if any */
  otherCountries: { count: number; requests: number } | null;
  /** Top objects by downloads */
  files: { path: string; requests: number; bytes: number }[];
}

/**
 * By-country and top-files breakdowns for the product analytics page.
 * Same contract as getUsage: null when unconfigured or the query fails.
 */
export async function getProductBreakdowns(
  accountId: string,
  productId: string,
  days: UsageWindow,
): Promise<ProductBreakdowns | null> {
  if (!isAnalyticsConfigured()) return null;
  const from = usageFrom(accountId, productId, undefined, days);

  try {
    const [countryRows, fileRows] = await Promise.all([
      usageQuery(
        `SELECT blob6 AS country, SUM(_sample_interval) AS requests ${from} GROUP BY country ORDER BY requests DESC`,
      ),
      usageQuery(
        `SELECT blob3 AS file, SUM(_sample_interval) AS requests, SUM(_sample_interval * double1) AS bytes ${from} GROUP BY file ORDER BY requests DESC LIMIT ${FILE_LIST_LIMIT}`,
      ),
    ]);

    const rest = countryRows.slice(COUNTRY_LIST_LIMIT);
    return {
      countries: countryRows.slice(0, COUNTRY_LIST_LIMIT).map((row) => ({
        code: str(row.country) || "??",
        name: countryName(str(row.country)),
        requests: num(row.requests),
      })),
      otherCountries: rest.length
        ? {
            count: rest.length,
            requests: rest.reduce((sum, row) => sum + num(row.requests), 0),
          }
        : null,
      files: fileRows.map((row) => ({
        path: str(row.file),
        requests: num(row.requests),
        bytes: num(row.bytes),
      })),
    };
  } catch (error) {
    LOGGER.warn("Analytics breakdown query failed", {
      operation: "getProductBreakdowns",
      context: "analytics engine",
      metadata: { accountId, productId, days, error: String(error) },
    });
    return null;
  }
}

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

/** "US" → "United States"; non-ISO values (e.g. "T1", "") fall back to the code. */
export function countryName(code: string): string {
  if (!code) return "Unknown";
  try {
    return countryNames.of(code) || code;
  } catch {
    return code;
  }
}

/** "US" → "United States (US)"; non-ISO values (e.g. "T1") pass through. */
function countryLabel(code: string): string {
  if (!code) return "(unknown)";
  const name = countryName(code);
  return name !== code ? `${name} (${code})` : code;
}

/** Display key for one grouped row, e.g. "ftw/global-data · United States (US)". */
function rowKey(row: Row, groupBy: AdminDimension[]): string {
  return groupBy
    .map((dim) => {
      switch (dim) {
        case "account":
          return str(row.blob1);
        case "product":
          return `${str(row.blob1)}/${str(row.blob2)}`;
        case "country":
          return countryLabel(str(row.blob6));
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
  // estimates can put the slice a hair above the total). Gate on either
  // metric — a remainder can be requests-only (zero-byte 200s pass the
  // served filter) and must still show in the Requests view.
  let hasOther = false;
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
      hasOther = true;
    }
  });
  const series = hasOther ? [...chartKeys, OTHER_KEY] : chartKeys;

  // Table remainder beyond the top TABLE_GROUP_LIMIT groups.
  const remainder = {
    bytes: Math.max(0, totals.bytes - groups.reduce((sum, g) => sum + g.bytes, 0)),
    requests: Math.max(
      0,
      totals.requests - groups.reduce((sum, g) => sum + g.requests, 0),
    ),
  };
  if (remainder.bytes > 0 || remainder.requests > 0) {
    groups.push({ key: OTHER_KEY, ...remainder });
  }

  return { buckets, bucketHours, series, points, groups, totals };
}
