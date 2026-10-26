import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import { StatusCodes } from "http-status-codes";
import { z, ZodTypeAny } from "zod";
import { PROBLEM_CONTENT_TYPE, PROBLEMS, ProblemCode } from "./problems";

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

const INTERNAL = "Internal";

/**
 * Marks a route that only Source's own services, or a partner such as GitHub,
 * call. It is listed so the reference describes everything deployed, and
 * flagged so no client builds on it.
 */
export const internal = { tags: [INTERNAL], "x-internal": true };

const PROBLEM_CODES = Object.keys(PROBLEMS) as [ProblemCode, ...ProblemCode[]];

const FieldProblemSchema = z
  .object({
    detail: z.string().openapi({ description: "What is wrong with this field." }),
    pointer: z.string().optional().openapi({
      description:
        "A JSON Pointer (RFC 6901), as a URI fragment, to the field in the request body: `#/metadata/title`.",
    }),
    parameter: z
      .string()
      .optional()
      .openapi({ description: "The query parameter at fault, when the field is one." }),
  })
  .openapi("FieldProblem");

/**
 * Every error's body: an RFC 9457 problem. Exported so an endpoint whose
 * problem carries an extension member can extend it.
 */
export const ProblemSchema = registry.register(
  "Problem",
  z
    .object({
      type: z.string().url().openapi({
        description:
          "Identifies the kind of problem. It is the URL of a page that explains the problem and what to do about it, on the host that answered.",
        example: "https://source.coop/api/problems/not_found",
      }),
      title: z.string().openapi({
        description: "A short summary of the type, the same for every occurrence of it.",
        example: PROBLEMS.not_found.title,
      }),
      status: z.number().int().openapi({
        description: "The HTTP status code, repeated for clients that lose it.",
        example: PROBLEMS.not_found.status,
      }),
      detail: z.string().openapi({
        description: "A sentence for a person about this occurrence.",
        example: "Product example/missing not found",
      }),
      instance: z.string().url().optional().openapi({
        description: "The URL of the request the problem occurred at, without its query.",
        example: "https://source.coop/api/v1/products/example/missing",
      }),
      code: z.enum(PROBLEM_CODES).openapi({
        description:
          "The type's last path segment, for clients that switch on a short string.",
      }),
      errors: z.array(FieldProblemSchema).optional().openapi({
        description: "For `invalid`: one entry for each problem with a request field.",
      }),
      request_id: z.string().optional().openapi({
        description:
          "Our ID for the request. Quote it when you report a problem, and we can find the request in our logs.",
      }),
    })
    .openapi({
      description: `An RFC 9457 problem, served as \`${PROBLEM_CONTENT_TYPE}\`. The types are listed at https://source.coop/api/problems.`,
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

/** A problem response, in `schema` (`ProblemSchema` or an extension of it). */
export const problemJson = (description: string, schema: ZodTypeAny) => ({
  description,
  content: { [PROBLEM_CONTENT_TYPE]: { schema } },
});

/** The error responses a route can return, each an RFC 9457 `Problem`. */
export const errors = (...statuses: (keyof typeof ERRORS)[]) =>
  Object.fromEntries(statuses.map((s) => [s, problemJson(ERRORS[s], ProblemSchema)]));

export function generateDocument() {
  const document = new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Source Cooperative API",
      version: "1.0.0",
      description: `Everything you can do on source.coop, over HTTP.\n\nEvery error is an [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem, served as \`${PROBLEM_CONTENT_TYPE}\`. Its \`type\` is a URL whose page explains the problem and what to do about it; the types are listed at https://source.coop/api/problems.`,
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
