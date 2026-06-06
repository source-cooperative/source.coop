import nextConfig from "./next.config.js";

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
    expect(result).toEqual([
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]);
  });

  test("prod stage emits no header overrides", async () => {
    process.env.STAGE = "prod";
    const result = await nextConfig.headers!();
    expect(result).toEqual([]);
  });

  test("missing STAGE defaults to noindex", async () => {
    delete process.env.STAGE;
    const result = await nextConfig.headers!();
    expect(result).toEqual([
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ]);
  });
});
