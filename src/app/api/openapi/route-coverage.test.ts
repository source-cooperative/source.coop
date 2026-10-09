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
  "DELETE /products/{account_id}/{repository_id}",
  "GET /accounts/{account_id}",
  "GET /accounts/{account_id}/flags",
  "GET /accounts/{account_id}/profile",
  "GET /data-connections",
  "GET /data-connections/{data_connection_id}",
  "GET /products/{account_id}",
  "GET /products/{account_id}/{repository_id}",
  "GET /products/{account_id}/{repository_id}/permissions",
  "GET /products/featured",
  "GET /whoami",
  "POST /accounts/{account_id}/trusts/exchanges",
  "POST /data-connections",
  "POST /products/{account_id}",
  "POST /secret-scanning/github",
  "POST /service-account-keys/exchanges",
  "POST /service-account-keys/revocations",
  "PUT /accounts/{account_id}/flags",
  "PUT /accounts/{account_id}/profile",
  "PUT /data-connections/{data_connection_id}",
  "PUT /products/{account_id}/{repository_id}",
  "PUT /products/{account_id}/{repository_id}/featured",
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
        /export (?:async function|const|function) (GET|POST|PUT|PATCH|DELETE)\b/g
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
