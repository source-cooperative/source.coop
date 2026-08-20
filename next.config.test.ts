import nextConfig from "./next.config.js";

const CORS_HEADERS = [
  {
    source: "/api/v1/accounts/:account_id",
    headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
  },
  {
    source: "/api/v1/products/:account_id",
    headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
  },
  {
    source: "/api/v1/products/:account_id/:product_id",
    headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
  },
];

const NOINDEX = {
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
    expect(result).toEqual([...CORS_HEADERS, NOINDEX]);
  });

  test("prod stage emits no noindex override", async () => {
    process.env.STAGE = "prod";
    const result = await nextConfig.headers!();
    expect(result).toEqual(CORS_HEADERS);
  });

  test("missing STAGE defaults to noindex", async () => {
    delete process.env.STAGE;
    const result = await nextConfig.headers!();
    expect(result).toEqual([...CORS_HEADERS, NOINDEX]);
  });

  // The wizards on docs.source.coop are unauthenticated cross-origin callers:
  // the API must stay readable to them in production, where the noindex
  // override is skipped.
  test("CORS headers apply in every stage, including prod", async () => {
    for (const stage of ["dev", "staging", "prod"]) {
      process.env.STAGE = stage;
      const result = await nextConfig.headers!();
      for (const cors of CORS_HEADERS) {
        expect(result).toContainEqual(cors);
      }
    }
  });

  // Allow-Credentials plus a wildcard origin is rejected by browsers, and
  // would expose authenticated responses if it ever worked.
  test("never grants credentialed cross-origin access", async () => {
    process.env.STAGE = "prod";
    const result = await nextConfig.headers!();
    const keys = result.flatMap((r) => r.headers.map((h) => h.key.toLowerCase()));
    expect(keys).not.toContain("access-control-allow-credentials");
  });
});
