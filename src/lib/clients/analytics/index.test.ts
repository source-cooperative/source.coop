/**
 * Tests for the Analytics Engine client: SQL construction (escaping, sampling
 * weights, filters), response parsing/zero-filling, and top-N/"Other" math.
 * The SQL API itself is mocked at the fetch layer.
 */
import { getUsage, getAdminBreakdown, USAGE_DAYS } from "./index";
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

describe("getUsage", () => {
  it("queries with sampling weights and served-bytes filters", async () => {
    await getUsage("acct", "prod");

    const [seriesSql, totalsSql] = sentSql();
    for (const sql of [seriesSql, totalsSql]) {
      expect(sql).toContain("SUM(_sample_interval * double1) AS bytes");
      expect(sql).toContain("SUM(_sample_interval) AS requests");
      expect(sql).toContain("blob4 = 'GET' AND double2 IN (200, 206)");
      expect(sql).toContain("blob1 = 'acct'");
      expect(sql).toContain("blob2 = 'prod'");
      expect(sql).toContain(`INTERVAL '${USAGE_DAYS}' DAY`);
      expect(sql).toContain("FROM test_dataset");
    }
    expect(seriesSql).toContain("toStartOfDay(timestamp)");
    expect(totalsSql).not.toContain("GROUP BY");

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

  it("zero-fills the day grid and coerces string numbers", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse([
          {
            day: todayUtc(),
            bytes: 1024,
            full_bytes: 1000,
            partial_bytes: 24,
            // UInt64 aggregates arrive as strings in the JSON format
            requests: "7",
            visitors: "3",
            countries: 2,
          },
        ]),
      )
      .mockResolvedValueOnce(
        jsonResponse([
          {
            bytes: 1024,
            full_bytes: 1000,
            partial_bytes: 24,
            requests: "7",
            visitors: "3",
            countries: 2,
          },
        ]),
      );

    const usage = await getUsage("acct", "prod");

    expect(usage).not.toBeNull();
    expect(usage!.days).toHaveLength(USAGE_DAYS);
    const today = usage!.days[USAGE_DAYS - 1];
    expect(today).toMatchObject({ bytes: 1024, requests: 7, visitors: 3 });
    // Every earlier day is zero-filled
    expect(usage!.days[0]).toMatchObject({ bytes: 0, requests: 0 });
    expect(usage!.totals).toEqual({
      bytes: 1024,
      fullBytes: 1000,
      partialBytes: 24,
      requests: 7,
      visitors: 3,
      countries: 2,
    });
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

describe("getAdminBreakdown", () => {
  it("returns a single 'All traffic' series when not grouping", async () => {
    const bucket = todayUtc();
    fetchMock.mockResolvedValue(
      jsonResponse([{ bucket, bytes: 500, requests: "5" }]),
    );

    const breakdown = await getAdminBreakdown({ window: "24h", groupBy: [] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sql = sentSql()[0];
    expect(sql).toContain("toStartOfInterval(timestamp, INTERVAL '1' HOUR)");
    expect(sql).toContain("INTERVAL '24' HOUR");

    expect(breakdown!.series).toEqual(["All traffic"]);
    expect(breakdown!.totals).toEqual({ bytes: 500, requests: 5 });
    // 24 hourly buckets plus the in-progress one
    expect(breakdown!.buckets.length).toBeGreaterThanOrEqual(24);
    const filled = breakdown!.points.filter((p) => p["All traffic"]);
    expect(filled).toEqual([{ "All traffic": { bytes: 500, requests: 5 } }]);
  });

  it("applies account/product filters", async () => {
    await getAdminBreakdown({
      window: "1wk",
      groupBy: [],
      account: "ft'w",
      product: "global",
    });
    const sql = sentSql()[0];
    expect(sql).toContain("blob1 = 'ft\\'w'");
    expect(sql).toContain("blob2 = 'global'");
    expect(sql).toContain("INTERVAL '168' HOUR");
    expect(sql).toContain("toStartOfInterval(timestamp, INTERVAL '6' HOUR)");
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
      window: "24h",
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
      window: "24h",
      groupBy: ["account", "country"],
    });
    expect(breakdown!.series).toEqual(["a1 · US"]);
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
      window: "24h",
      groupBy: ["country"],
    });
    expect(breakdown!.series).toEqual(["(unknown)"]);
  });

  it("returns null when analytics is not configured", async () => {
    const token = CONFIG.analytics.apiToken;
    (CONFIG.analytics as { apiToken: string }).apiToken = "";
    try {
      expect(await getAdminBreakdown({ window: "24h", groupBy: [] })).toBeNull();
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
      getAdminBreakdown({ window: "24h", groupBy: ["account"] }),
    ).rejects.toThrow("Analytics Engine query failed (403)");
  });
});
