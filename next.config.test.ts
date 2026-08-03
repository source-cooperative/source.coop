import nextConfig from "./next.config.js";

const STATIC_ASSET_RULE = {
  source: "/:dir(img|logo)/:path*",
  headers: [
    {
      key: "Cache-Control",
      value: "public, max-age=3600, stale-while-revalidate=604800",
    },
  ],
};

const NOINDEX_RULE = {
  source: "/:path*",
  headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
};

describe("next.config headers()", () => {
  const originalStage = process.env.STAGE;

  afterEach(() => {
    if (originalStage === undefined) {
      delete process.env.STAGE;
    } else {
      process.env.STAGE = originalStage;
    }
  });

  test("non-prod stage emits noindex header on all paths", async () => {
    process.env.STAGE = "dev";
    const result = await nextConfig.headers!();
    expect(result).toEqual([STATIC_ASSET_RULE, NOINDEX_RULE]);
  });

  test("prod stage emits no noindex override", async () => {
    process.env.STAGE = "prod";
    const result = await nextConfig.headers!();
    expect(result).toEqual([STATIC_ASSET_RULE]);
  });

  test("missing STAGE defaults to noindex", async () => {
    delete process.env.STAGE;
    const result = await nextConfig.headers!();
    expect(result).toEqual([STATIC_ASSET_RULE, NOINDEX_RULE]);
  });

  test("static assets stay cacheable in every stage", async () => {
    for (const stage of ["prod", "dev"]) {
      process.env.STAGE = stage;
      const result = await nextConfig.headers!();
      expect(result).toContainEqual(STATIC_ASSET_RULE);
    }
  });
});
