/** @jest-environment node */
import SwaggerParser from "@apidevtools/swagger-parser";
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
  let paths: Record<string, Record<string, Operation>>;
  beforeAll(async () => {
    ({ paths } = (await SwaggerParser.dereference(
      structuredClone(await GET().json())
    )) as unknown as { paths: Record<string, Record<string, Operation>> });
  });

  // A failure here is a change the proxy may not survive. Check cache.rs: an
  // added optional field is safe, and `jest -u` accepts it; a removed or
  // retyped one, or a different status, needs a data.source.coop change first.
  test.each(PROXY_CALLS)("%s keeps its request and responses", (call) => {
    const [method, path] = call.split(" ");
    const operation = paths[path]?.[method.toLowerCase()];
    expect(operation).toBeDefined();
    const { parameters, requestBody, responses } = operation;
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
