/** @jest-environment node */
import SwaggerParser from "@apidevtools/swagger-parser";
import { DATA_PROXY } from "@/lib/api/openapi";
import { GET } from "./route";

jest.mock("@/lib/api/utils", () => ({ getApiSession: jest.fn() }));
jest.mock("@/lib/clients/database", () => ({}));

/**
 * What data.source.coop calls, from its `src/source_api/cache.rs`. The proxy
 * treats 200 as the only success, 404 as a missing bucket and 401/403 as a
 * refusal, and parses only a 200's body, so those are what's pinned here.
 */
const PROXY_CALLS = [
  "GET /products/{account_id}",
  "GET /products/{account_id}/{product_id}",
  "GET /products/{account_id}/{product_id}/permissions",
  "POST /accounts/{account_id}/trusts/exchanges",
  "POST /service-account-keys/exchanges",
];

type Operation = {
  "x-consumers"?: string[];
  parameters?: unknown;
  requestBody?: unknown;
  responses: Record<string, { content?: unknown }>;
};

/** `value` without its prose, which can change without the proxy noticing. */
const shape = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(shape)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => !["description", "summary", "example", "examples"].includes(key))
            .map(([key, v]) => [key, shape(v)])
        )
      : value;

describe("the endpoints the data proxy calls", () => {
  let operations: Record<string, Operation>;
  beforeAll(async () => {
    const document = (await SwaggerParser.dereference(
      structuredClone(await GET().json())
    )) as unknown as { paths: Record<string, Record<string, Operation>> };
    operations = Object.fromEntries(
      Object.entries(document.paths).flatMap(([path, item]) =>
        Object.entries(item)
          .filter(([, op]) => op["x-consumers"]?.includes(DATA_PROXY))
          .map(([method, op]) => [`${method.toUpperCase()} ${path}`, op])
      )
    );
  });

  test("are exactly the ones marked with forDataProxy", () => {
    expect(Object.keys(operations).sort()).toEqual([...PROXY_CALLS].sort());
  });

  // A failure here is a change the proxy may not survive. Check cache.rs: an
  // added optional field is safe, and `jest -u` accepts it; a removed or
  // retyped one, or a different status, needs a data.source.coop change first.
  test.each(PROXY_CALLS)("%s keeps its request and responses", (call) => {
    const { parameters, requestBody, responses } = operations[call];
    expect(
      shape({
        parameters,
        requestBody,
        statuses: Object.keys(responses),
        ok: responses["200"]?.content,
      })
    ).toMatchSnapshot();
  });
});
