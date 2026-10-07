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
    "A token from `source-coop login`, or one a service account's API key was exchanged for. Requests that change something must carry one; reads also accept the source.coop session cookie.",
});

/** Marks a route as one that takes a bearer token. */
export const bearer = [{ [bearerAuth.name]: [] }];

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
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Source Cooperative API",
      version: "1.0.0",
      description:
        "Everything you can do on source.coop, over HTTP. Errors share one shape: `{ \"error\": { \"code\", \"message\", \"field_errors\"? } }`.",
    },
    servers: [{ url: "/api/v1" }],
  });
}
