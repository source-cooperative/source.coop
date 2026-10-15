import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { StatusCodes } from "http-status-codes";
import { z, ZodTypeAny } from "zod";

extendZodWithOpenApi(z);

/**
 * Every documented `/api/v1` endpoint registers itself here, from its route
 * module, with the same Zod schemas its operation parses. `/api/openapi`
 * serves what this generates.
 */
export const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "An access token from `source-coop login` (`source-coop auth token` prints one), or a token the data proxy signs for a service account. Requests that change something must carry one; reads also accept the source.coop session cookie.",
});

/** Marks a route as one that takes a bearer token. */
export const bearer = [{ [bearerAuth.name]: [] }];

/** Marks a route whose answer depends on a bearer token, but that needs none. */
export const optionalBearer = [{}, ...bearer];

export const DATA_PROXY = "data-proxy";

/**
 * Marks a route the data proxy calls (data.source.coop's
 * `src/source_api/cache.rs`), whose request and responses
 * `data-proxy-contract.test.ts` holds fixed. Takes the route's description.
 */
export const forDataProxy = (description: string) => ({
  description: `**The data proxy depends on this endpoint**; change its request or responses only together with data.source.coop.\n\n${description}`,
  "x-consumers": [DATA_PROXY],
});

const INTERNAL = "Internal";

/**
 * Marks a route that only Source's own services, or a partner such as GitHub,
 * call. It is listed so the reference describes everything deployed, and
 * flagged so no client builds on it.
 */
export const internal = { tags: [INTERNAL], "x-internal": true };

const ErrorSchema = registry.register(
  "Error",
  z.object({
    error: z.object({
      code: z
        .enum([
          "invalid",
          "unauthenticated",
          "forbidden",
          "not_found",
          "conflict",
          "internal",
        ])
        .openapi({ description: "What kind of failure this is." }),
      message: z.string().openapi({ description: "A sentence for a person." }),
      field_errors: z
        .record(z.array(z.string()))
        .optional()
        .openapi({
          description:
            "For `invalid`: the problems with each named request field.",
        }),
    }),
  })
);

const ERRORS: Record<number, string> = {
  [StatusCodes.BAD_REQUEST]: "The request is invalid.",
  [StatusCodes.UNAUTHORIZED]: "No valid credentials were given.",
  [StatusCodes.FORBIDDEN]: "The caller may not do this.",
  [StatusCodes.NOT_FOUND]: "Something the request names doesn't exist.",
  [StatusCodes.CONFLICT]: "The resource isn't in a state that allows this.",
};

export const accountParams = z.object({
  account_id: z.string().openapi({ description: "The account's ID." }),
});

export const productParams = z.object({
  account_id: z.string().openapi({ description: "The product owner's ID." }),
  product_id: z.string().openapi({ description: "The product's ID." }),
});

export const membershipIdParams = z.object({
  membership_id: z.string().openapi({ description: "The membership's ID." }),
});

export const json =(description: string, schema: ZodTypeAny) => ({
  description,
  content: { "application/json": { schema } },
});

/** The error responses a route can return, each in the shared `Error` shape. */
export const errors = (...statuses: (keyof typeof ERRORS)[]) =>
  Object.fromEntries(statuses.map((s) => [s, json(ERRORS[s], ErrorSchema)]));

export function generateDocument() {
  const document = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Source Cooperative API",
      version: "1.0.0",
      description: "Everything you can do on source.coop, over HTTP.",
    },
    servers: [{ url: "/api/v1" }],
  });
  // Swagger UI and Redoc list the declared tags first, in declared order, so
  // every tag is declared, in the order routes register, and Internal last.
  const tags = new Set(
    Object.values(document.paths).flatMap((path) =>
      Object.values(path).flatMap((op) => (op as { tags?: string[] }).tags ?? [])
    )
  );
  tags.delete(INTERNAL);
  document.tags = [
    ...[...tags].map((name) => ({ name })),
    {
      name: INTERNAL,
      description:
        "**Not for public use.** Called by Source's data proxy or by GitHub, authenticated in ways no client can be. Listed so this reference matches what is deployed; they may change without notice.",
    },
  ];
  return document;
}
