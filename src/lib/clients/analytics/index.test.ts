/**
 * Tests for the Analytics Engine client: SQL construction (escaping, sampling
 * weights, filters), response parsing/zero-filling, and top-N/"Other" math.
 * The SQL API itself is mocked at the fetch layer.
 */
import {
  getUsage,
  getAdminBreakdown,
  getProductBreakdowns,
  USAGE_DAYS,
} from "./index";
import { CONFIG } from "@/lib/config";

jest.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

jest.mock("@/lib/config", () => ({
  CONFIG: {
    analytics: {
      accountId: "cf-account",
      apiToken: "cf-token",
      dataset: "test_dataset",
    },
    environment: { isDevelopment: false, isTest: true, stage: "test" },
    // logging.ts reads this at module load
    auth: { accessToken: "test-token" },
  },
}));

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(rows: Record<string, unknown>[]) {
  return {
    ok: true,
    json: async () => ({ meta: [], data: rows, rows: rows.length }),
  };
}

/** The SQL strings sent to the API, in call order. */
const sentSql = () => fetchMock.mock.calls.map((call) => call[1].body as string);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse([]));
});

/** AE DateTime string for the start of the current UTC day. */
function todayUtc(): string {
  const d = new Date(new Date().setUTCHours(0, 0, 0, 0));
  return d.toISOString().replace("T", " ").replace(".000Z", "");
}

/** YYYY-MM-DD for the UTC day n days ago. */
const isoDaysAgo = (n: number) =>
  new Date(new Date().setUTCHours(0, 0, 0, 0) - n * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** Inclusive single-day range covering today (hourly buckets). */
const TODAY_RANGE = { from: isoDaysAgo(0), to: isoDaysAgo(0) };

describe("getUsage", () => {
  it("queries with sampling weights and served-bytes filters", async () => {
    await getUsage("acct", "prod");

    const [seriesSql, windowSql, ipsSql, registeredSql] = sentSql();
    for (const sql of [seriesSql, windowSql, ipsSql, registeredSql]) {
      // Float literals: AE 422s on Double-vs-Integer comparisons.
      expect(sql).toContain("blob4 = 'GET' AND double2 IN (200.0, 206.0)");
      expect(sql).toContain("blob1 = 'acct'");
      expect(sql).toContain("blob2 = 'prod'");
      // Day-aligned window: today (partial) + USAGE_DAYS-1 full UTC days,
      // identical for series, totals, and breakdowns.
      expect(sql).toContain(
        `timestamp >= toStartOfDay(NOW() - INTERVAL '${USAGE_DAYS - 1}' DAY)`,
      );
      expect(sql).toContain("FROM test_dataset");
    }
    expect(seriesSql).toContain("toStartOfDay(timestamp)");
    expect(seriesSql).toContain("SUM(_sample_interval * double1) AS bytes");
    expect(seriesSql).toContain("SUM(_sample_interval) AS requests");
    expect(windowSql).toContain("COUNT(DISTINCT blob6) AS countries");
    expect(windowSql).toContain("sumIf(_sample_interval, blob5 = '') AS anon_requests");
    expect(windowSql).not.toContain("GROUP BY");
    expect(ipsSql).toContain("blob8 != ''");
    expect(ipsSql).toContain("GROUP BY ip");
    expect(registeredSql).toContain("COUNT(DISTINCT blob5) AS registered");
    expect(registeredSql).toContain("blob5 != ''");

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer cf-token");
  });

  it("escapes quotes, backslashes, and control chars in values", async () => {
    await getUsage("a'; DROP--", "pr\\od", "dir/we'ird\u0000.txt");

    const sql = sentSql()[0];
    expect(sql).toContain("blob1 = 'a\\'; DROP--'");
    expect(sql).toContain("blob2 = 'pr\\\\od'");
    expect(sql).toContain("blob3 = 'dir/we\\'ird.txt'");
  });

  it("truncates the object path filter to 256 bytes like the data proxy", async () => {
    // 300 two-byte chars: proxy stores the first 256 bytes = 128 chars.
    await getUsage("acct", "prod", "é".repeat(300));
    expect(sentSql()[0]).toContain(`blob3 = '${"é".repeat(128)}'`);
  });

  it("zero-fills the day grid, coerces strings, and buckets user frequency", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          // UInt64 aggregates arrive as strings in the JSON format
          { day: todayUtc(), bytes: 1024, requests: "7", countries: 2 },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ countries: 2, anon_requests: "5" }]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          { ip: "h1", requests: 1 },
          { ip: "h2", requests: "3" },
          { ip: "h3", requests: 7 },
          { ip: "h4", requests: 25 },
          // sampled fraction rounds down to 0 → floored into the 1× bucket
          { ip: "h5", requests: 0.4 },
        ]),
      )
      .mockResolvedValueOnce(jsonResponse([{ registered: "2" }]));

    const usage = await getUsage("acct", "prod");

    expect(usage).not.toBeNull();
    expect(usage!.days).toHaveLength(USAGE_DAYS);
    const today = usage!.days[USAGE_DAYS - 1];
    expect(today).toMatchObject({ bytes: 1024, requests: 7, countries: 2 });
    // Every earlier day is zero-filled
    expect(usage!.days[0]).toMatchObject({ bytes: 0, requests: 0 });
    expect(usage!.totals).toEqual({ bytes: 1024, requests: 7, countries: 2 });
    expect(usage!.users).toEqual({
      uniqueIps: 5,
      registered: 2,
      anonRequests: 5,
      frequency: [
        { label: "1×", count: 2 },
        { label: "2–5×", count: 1 },
        { label: "6–20×", count: 1 },
        { label: "20×+", count: 1 },
      ],
    });
  });

  it("applies the requested window to the queries and the grid", async () => {
    const usage = await getUsage("acct", "prod", undefined, 7);
    expect(sentSql()[0]).toContain("toStartOfDay(NOW() - INTERVAL '6' DAY)");
    expect(usage!.days).toHaveLength(7);
  });

  it("returns null when analytics is not configured", async () => {
    const token = CONFIG.analytics.apiToken;
    (CONFIG.analytics as { apiToken: string }).apiToken = "";
    try {
      expect(await getUsage("acct", "prod")).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      (CONFIG.analytics as { apiToken: string }).apiToken = token;
    }
  });

  it("returns null when the query fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    });
    expect(await getUsage("acct", "prod")).toBeNull();
  });
});

describe("getProductBreakdowns", () => {
  it("ranks countries with an others aggregate and lists top files", async () => {
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const sql = init.body;
      if (sql.includes("GROUP BY country")) {
        return jsonResponse([
          { country: "US", requests: 100 },
          { country: "DE", requests: 50 },
          { country: "BR", requests: 40 },
          { country: "GB", requests: 30 },
          { country: "IN", requests: "20" },
          { country: "FR", requests: 10 },
          { country: "", requests: 5 },
        ]);
      }
      return jsonResponse([
        { file: "a.tif", requests: 60, bytes: 1000 },
        { file: "b.json", requests: "40", bytes: "500" },
      ]);
    });

    const breakdowns = await getProductBreakdowns("acct", "prod", 30);

    expect(breakdowns!.countries).toHaveLength(5);
    expect(breakdowns!.countries[0]).toEqual({
      code: "US",
      name: "United States",
      requests: 100,
    });
    expect(breakdowns!.otherCountries).toEqual({ count: 2, requests: 15 });
    expect(breakdowns!.files).toEqual([
      { path: "a.tif", requests: 60, bytes: 1000 },
      { path: "b.json", requests: 40, bytes: 500 },
    ]);

    const fileSql = sentSql().find((sql) => sql.includes("GROUP BY file"));
    expect(fileSql).toContain("ORDER BY requests DESC");
    expect(fileSql).toContain("LIMIT 10");
    expect(fileSql).toContain("blob1 = 'acct'");
  });

  it("returns no others aggregate when few countries", async () => {
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      return jsonResponse(
        init.body.includes("GROUP BY country")
          ? [{ country: "US", requests: 10 }]
          : [],
      );
    });
    const breakdowns = await getProductBreakdowns("acct", "prod", 7);
    expect(breakdowns!.otherCountries).toBeNull();
    expect(breakdowns!.files).toEqual([]);
  });

  it("returns null when the query fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "boom",
    });
    expect(await getProductBreakdowns("acct", "prod", 30)).toBeNull();
  });
});

describe("getAdminBreakdown", () => {
  it("returns a single 'All traffic' series when not grouping", async () => {
    const bucket = todayUtc();
    fetchMock.mockResolvedValue(
      jsonResponse([{ bucket, bytes: 500, requests: "5" }]),
    );

    const breakdown = await getAdminBreakdown({ ...TODAY_RANGE, groupBy: [] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sql = sentSql()[0];
    // Single-day range → hourly buckets from today's UTC midnight, no upper bound
    expect(sql).toContain("toStartOfInterval(timestamp, INTERVAL '1' HOUR)");
    expect(sql).toContain("timestamp >= toStartOfDay(NOW() - INTERVAL '0' DAY)");
    expect(sql).not.toContain("timestamp <");

    expect(breakdown!.range).toEqual(TODAY_RANGE);
    expect(breakdown!.series).toEqual(["All traffic"]);
    expect(breakdown!.totals).toEqual({ bytes: 500, requests: 5 });
    // Hourly buckets: midnight through the in-progress hour
    expect(breakdown!.buckets.length).toBeGreaterThanOrEqual(1);
    expect(breakdown!.buckets.length).toBeLessThanOrEqual(25);
    const filled = breakdown!.points.filter((p) => p["All traffic"]);
    expect(filled).toEqual([{ "All traffic": { bytes: 500, requests: 5 } }]);
  });

  it("applies account/product filters over a week range", async () => {
    await getAdminBreakdown({
      from: isoDaysAgo(6),
      to: isoDaysAgo(0),
      groupBy: [],
      account: "ft'w",
      product: "global",
    });
    const sql = sentSql()[0];
    expect(sql).toContain("blob1 = 'ft\\'w'");
    expect(sql).toContain("blob2 = 'global'");
    expect(sql).toContain("timestamp >= toStartOfDay(NOW() - INTERVAL '6' DAY)");
    expect(sql).toContain("toStartOfInterval(timestamp, INTERVAL '6' HOUR)");
  });

  it("honors a whitelisted sum interval and escalates unreadable ones", async () => {
    await getAdminBreakdown({ ...TODAY_RANGE, groupBy: [], bucketHours: 6 });
    expect(sentSql()[0]).toContain("toStartOfInterval(timestamp, INTERVAL '6' HOUR)");

    fetchMock.mockClear();
    // Hourly over ~92 days would be ~2,200 bars — escalates until drawable.
    await getAdminBreakdown({
      from: isoDaysAgo(91),
      to: isoDaysAgo(0),
      groupBy: [],
      bucketHours: 1,
    });
    expect(sentSql()[0]).toContain("toStartOfInterval(timestamp, INTERVAL '6' HOUR)");

    fetchMock.mockClear();
    // Non-whitelisted values fall back to auto (1h for a single day).
    await getAdminBreakdown({ ...TODAY_RANGE, groupBy: [], bucketHours: 5 });
    expect(sentSql()[0]).toContain("toStartOfInterval(timestamp, INTERVAL '1' HOUR)");
  });

  it("swaps reversed bounds and bounds ranges that end before today", async () => {
    const breakdown = await getAdminBreakdown({
      from: isoDaysAgo(3),
      to: isoDaysAgo(10),
      groupBy: [],
    });
    const sql = sentSql()[0];
    expect(sql).toContain("timestamp >= toStartOfDay(NOW() - INTERVAL '10' DAY)");
    // Exclusive upper bound: the start of the day after `to` (3 days ago)
    expect(sql).toContain("timestamp < toStartOfDay(NOW() - INTERVAL '2' DAY)");
    // 8-day range → daily buckets
    expect(sql).toContain("toStartOfInterval(timestamp, INTERVAL '24' HOUR)");
    expect(breakdown!.range).toEqual({ from: isoDaysAgo(10), to: isoDaysAgo(3) });
  });

  it("ranks groups, charts the top slice, and derives Other from totals", async () => {
    const bucket = todayUtc();
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const sql = init.body;
      if (sql.includes("GROUP BY bucket, blob1, blob2")) {
        // Timeseries for the charted groups only
        return jsonResponse([
          { bucket, blob1: "a1", blob2: "p1", bytes: 600, requests: 6 },
          { bucket, blob1: "a2", blob2: "p2", bytes: 300, requests: 3 },
        ]);
      }
      if (sql.includes("GROUP BY bucket")) {
        // Overall per-bucket totals (includes long-tail traffic)
        return jsonResponse([{ bucket, bytes: 1000, requests: 10 }]);
      }
      // Ranked totals per group
      return jsonResponse([
        { blob1: "a1", blob2: "p1", bytes: 600, requests: 6 },
        { blob1: "a2", blob2: "p2", bytes: 300, requests: 3 },
      ]);
    });

    const breakdown = await getAdminBreakdown({
      ...TODAY_RANGE,
      groupBy: ["product"],
    });

    // The timeseries query is filtered to the charted groups
    const seriesSql = sentSql().find((sql) =>
      sql.includes("GROUP BY bucket, blob1, blob2"),
    );
    expect(seriesSql).toContain("(blob1 = 'a1' AND blob2 = 'p1')");
    expect(seriesSql).toContain("(blob1 = 'a2' AND blob2 = 'p2')");

    expect(breakdown!.series).toEqual(["a1/p1", "a2/p2", "Other"]);
    expect(breakdown!.totals).toEqual({ bytes: 1000, requests: 10 });

    const point = breakdown!.points.find((p) => p["a1/p1"]);
    expect(point).toEqual({
      "a1/p1": { bytes: 600, requests: 6 },
      "a2/p2": { bytes: 300, requests: 3 },
      Other: { bytes: 100, requests: 1 },
    });

    // Table rows: ranked groups plus the beyond-top-N remainder
    expect(breakdown!.groups).toEqual([
      { key: "a1/p1", bytes: 600, requests: 6 },
      { key: "a2/p2", bytes: 300, requests: 3 },
      { key: "Other", bytes: 100, requests: 1 },
    ]);
  });

  it("keeps a requests-only Other remainder visible", async () => {
    const bucket = todayUtc();
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const sql = init.body;
      if (sql.includes("GROUP BY bucket, blob1")) {
        return jsonResponse([{ bucket, blob1: "a1", bytes: 500, requests: 5 }]);
      }
      if (sql.includes("GROUP BY bucket")) {
        // Long tail served zero-byte responses: bytes covered, requests not.
        return jsonResponse([{ bucket, bytes: 500, requests: 9 }]);
      }
      return jsonResponse([{ blob1: "a1", bytes: 500, requests: 5 }]);
    });

    const breakdown = await getAdminBreakdown({
      ...TODAY_RANGE,
      groupBy: ["account"],
    });

    expect(breakdown!.series).toEqual(["a1", "Other"]);
    const point = breakdown!.points.find((p) => p.Other);
    expect(point!.Other).toEqual({ bytes: 0, requests: 4 });
    expect(breakdown!.groups).toEqual([
      { key: "a1", bytes: 500, requests: 5 },
      { key: "Other", bytes: 0, requests: 4 },
    ]);
  });

  it("composes keys across multiple group-bys", async () => {
    const bucket = todayUtc();
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const sql = init.body;
      if (sql.includes("GROUP BY bucket, blob1, blob6")) {
        return jsonResponse([
          { bucket, blob1: "a1", blob6: "US", bytes: 100, requests: 1 },
        ]);
      }
      if (sql.includes("GROUP BY bucket")) {
        return jsonResponse([{ bucket, bytes: 100, requests: 1 }]);
      }
      return jsonResponse([{ blob1: "a1", blob6: "US", bytes: 100, requests: 1 }]);
    });

    const breakdown = await getAdminBreakdown({
      ...TODAY_RANGE,
      groupBy: ["account", "country"],
    });
    expect(breakdown!.series).toEqual(["a1 · United States (US)"]);
  });

  it("labels empty dimension values as unknown", async () => {
    const bucket = todayUtc();
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const sql = init.body;
      if (sql.includes("GROUP BY bucket, blob6")) {
        return jsonResponse([{ bucket, blob6: "", bytes: 50, requests: 1 }]);
      }
      if (sql.includes("GROUP BY bucket")) {
        return jsonResponse([{ bucket, bytes: 50, requests: 1 }]);
      }
      return jsonResponse([{ blob6: "", bytes: 50, requests: 1 }]);
    });

    const breakdown = await getAdminBreakdown({
      ...TODAY_RANGE,
      groupBy: ["country"],
    });
    expect(breakdown!.series).toEqual(["(unknown)"]);
  });

  it("returns null when analytics is not configured", async () => {
    const token = CONFIG.analytics.apiToken;
    (CONFIG.analytics as { apiToken: string }).apiToken = "";
    try {
      expect(await getAdminBreakdown({ ...TODAY_RANGE, groupBy: [] })).toBeNull();
    } finally {
      (CONFIG.analytics as { apiToken: string }).apiToken = token;
    }
  });

  it("propagates query failures", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => "denied",
    });
    await expect(
      getAdminBreakdown({ ...TODAY_RANGE, groupBy: ["account"] }),
    ).rejects.toThrow("Analytics Engine query failed (403)");
  });
});
