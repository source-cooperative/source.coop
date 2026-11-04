/**
 * @jest-environment node
 */
import { CATALOG_URL } from "@/lib/catalog";
import { GET } from "./route";

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

it("serves the stats-only catalog with an hour of edge caching", async () => {
  const record = {
    account_id: "org", product_id: "data", total_bytes: 10, object_count: 1,
    exts: { tif: 1 }, assets: { large: "STAC detail" }, description: "dropped",
  };
  global.fetch = jest.fn().mockResolvedValue(
    new Response(`${JSON.stringify(record)}\n{bad json\n`),
  );
  const response = await GET();
  expect(global.fetch).toHaveBeenCalledWith(CATALOG_URL, { cache: "no-store" });
  expect(response.headers.get("Cache-Control")).toBe(
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  expect(await response.json()).toEqual([
    { account_id: "org", product_id: "data", total_bytes: 10, object_count: 1, exts: { tif: 1 } },
  ]);
});

it("does not cache an upstream failure", async () => {
  global.fetch = jest.fn().mockResolvedValue(new Response("", { status: 503 }));
  const response = await GET();
  expect(response.status).toBe(502);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
