/** @jest-environment node */
import { readdirSync, readFileSync } from "fs";
import path from "path";
import SwaggerParser from "@apidevtools/swagger-parser";
import { GET } from "./route";

jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/clients/database", () => ({}));

// The endpoints not yet in the reference. Each API sub-issue of #588 removes
// its own; adding to this list needs a reason in the PR.
const UNREGISTERED = new Set([
  "DELETE /accounts/{account_id}",
  "DELETE /data-connections/{data_connection_id}",
  "GET /data-connections",
  "GET /data-connections/{data_connection_id}",
  "POST /data-connections",
  "PUT /data-connections/{data_connection_id}",
]);

const V1 = path.join(__dirname, "../v1");

/** Every `METHOD /path` that a route module under /api/v1 exports. */
const endpoints = readdirSync(V1, { recursive: true })
  .map(String)
  .filter((file) => path.basename(file) === "route.ts")
  .flatMap((file) => {
    const route = "/" + path.dirname(file).split(path.sep).join("/");
    const source = readFileSync(path.join(V1, file), "utf8");
    return [
      ...source.matchAll(
        /export (?:async function|const|function) (GET|HEAD|POST|PUT|PATCH|DELETE)\b/g
      ),
    ].map(([, method]) => `${method} ${route.replace(/\[(\w+)\]/g, "{$1}")}`);
  });

describe("/api/openapi", () => {
  let document: { paths: Record<string, Record<string, unknown>> };
  beforeAll(async () => {
    document = await GET().json();
  });

  const documented = (endpoint: string) => {
    const [method, route] = endpoint.split(" ");
    return !!document.paths[route]?.[method.toLowerCase()];
  };

  test("can be fetched from api.docs.source.coop", () => {
    expect(GET().headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  test("declares every tag, with Internal last", () => {
    const used = new Set(
      Object.values(document.paths).flatMap((path) =>
        Object.values(path).flatMap((op) => (op as { tags?: string[] }).tags ?? [])
      )
    );
    const declared = (document as { tags?: { name: string }[] }).tags!.map((t) => t.name);
    expect(new Set(declared)).toEqual(used);
    expect(declared.at(-1)).toBe("Internal");
  });

  test("is a valid OpenAPI 3 document", async () => {
    await expect(
      SwaggerParser.validate(structuredClone(document) as never)
    ).resolves.toBeDefined();
  });

  test.each(endpoints.filter((e) => !UNREGISTERED.has(e)))(
    "documents %s",
    (endpoint) => expect(documented(endpoint)).toBe(true)
  );

  test("lists only endpoints that exist and are still undocumented", () => {
    const stale = [...UNREGISTERED].filter(
      (e) => !endpoints.includes(e) || documented(e)
    );
    expect(stale).toEqual([]);
  });
});
