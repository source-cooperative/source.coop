import { StatusCodes } from "http-status-codes";
import type { OperationError } from "@/lib/operations/result";

/**
 * Every error the API answers is an RFC 9457 problem: a JSON object served as
 * `application/problem+json`, whose `type` names the kind of failure. Each kind
 * is defined once, here. The handler, the OpenAPI reference and the pages at
 * `/api/problems/{code}` all read this table, so they can't disagree.
 */
export type ProblemCode = OperationError | "internal";

export const PROBLEM_CONTENT_TYPE = "application/problem+json";

/**
 * Where the problem pages live. `problem` gives a type as this path plus its
 * code, and `problemAt` makes it absolute on the origin that answered, so a
 * type resolves on the deployment that raised it, even one that adds a type
 * production doesn't have yet.
 */
export const PROBLEM_TYPE_PATH = "/api/problems/";

export const problemType = (code: ProblemCode) => `${PROBLEM_TYPE_PATH}${code}`;

interface ProblemDefinition {
  status: number;
  /** RFC 9457 `title`: the same for every occurrence of the type. */
  title: string;
  /** When the API answers it, published on the type's page. */
  description: string;
  /** What the caller can do about it, published on the type's page. */
  remedy: string;
}

export const PROBLEMS: Record<ProblemCode, ProblemDefinition> = {
  invalid: {
    status: StatusCodes.BAD_REQUEST,
    title: "Invalid request",
    description:
      "The request fails its schema or one of the API's rules. When particular fields are at fault, `errors` lists each one: `pointer` is a JSON Pointer into the request body, and `parameter` names a query parameter.",
    remedy:
      "Fix the fields that `errors` names and send the request again. Sending it unchanged gets the same answer.",
  },
  unauthenticated: {
    status: StatusCodes.UNAUTHORIZED,
    title: "Authentication required",
    description:
      "The endpoint needs credentials, and the request carries none, or carries some that are not valid. Requests that change something need a bearer token, even from a signed-in browser.",
    remedy:
      "Send `Authorization: Bearer` with a token. `source-coop auth token` prints one for you, and a service account can get one from the data proxy.",
  },
  forbidden: {
    status: StatusCodes.FORBIDDEN,
    title: "Forbidden",
    description:
      "The credentials are valid, but they may not do this. `detail` says which permission is missing.",
    remedy:
      "Ask someone who manages the account or product for the role you need, or sign in as an account that has it.",
  },
  not_found: {
    status: StatusCodes.NOT_FOUND,
    title: "Not found",
    description:
      "Nothing the request names exists, or it exists and you may not know about it. The API answers 404, not 403, for a thing you may not see, such as a deactivated product, so the two cases look the same.",
    remedy:
      "Check the IDs in the path. If the thing should exist, check that you are signed in as an account that can see it.",
  },
  conflict: {
    status: StatusCodes.CONFLICT,
    title: "Conflict",
    description:
      "The resource exists, but its current state does not allow the request: an ID that is already taken, or a delete that has to be a deactivation instead.",
    remedy:
      "Read `detail`, which says what to do instead. Retrying unchanged gets the same answer until the resource's state changes.",
  },
  internal: {
    status: StatusCodes.INTERNAL_SERVER_ERROR,
    title: "Internal server error",
    description:
      "Something failed inside the API. The answer deliberately says nothing more about what failed.",
    remedy:
      "Try again later. If it keeps happening, report it to hello@source.coop and include the `request_id` from the answer, which finds the request in our logs.",
  },
};

/** One problem with one field of the request. */
export interface FieldProblem {
  detail: string;
  /** A JSON Pointer (RFC 6901), as a URI fragment, into the request body. */
  pointer?: string;
  /** The query parameter at fault. */
  parameter?: string;
}

/** The body of every error answer. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  /** The URL the problem occurred at, without its query. */
  instance?: string;
  /** The type's last path segment, for clients that switch on a short string. */
  code: ProblemCode;
  errors?: FieldProblem[];
  /** The platform's ID for the request, which finds it in our logs. */
  request_id?: string;
}

/** Where an operation's input came from, so a field is named the right way. */
export type InputSource = "body" | "query";

// RFC 6901 escapes `~` and `/` in a segment, and its URI-fragment form
// (section 6) then percent-encodes what a fragment can't hold.
const escapePointerSegment = (segment: string) =>
  encodeURIComponent(segment.replace(/~/g, "~0").replace(/\//g, "~1"));

/**
 * Operations key field errors by dotted path (`metadata.tags.0`). A body field
 * becomes a JSON Pointer (`#/metadata/tags/0`) and a query field keeps its
 * name, as RFC 9457's examples do.
 */
export function toFieldProblems(
  fieldErrors: Record<string, string[]>,
  source: InputSource
): FieldProblem[] {
  return Object.entries(fieldErrors).flatMap(([field, messages]) =>
    messages.map((detail) =>
      source === "query"
        ? { detail, parameter: field }
        : {
            detail,
            pointer: "#/" + field.split(".").map(escapePointerSegment).join("/"),
          }
    )
  );
}

/** A problem of the given kind, with this occurrence's `detail`. */
export function problem(
  code: ProblemCode,
  detail: string,
  extensions: Partial<Problem> = {}
): Problem {
  const { status, title } = PROBLEMS[code];
  return { type: problemType(code), title, status, detail, code, ...extensions };
}

/** A problem as a response, with its status and media type. */
export function problemResponse(body: Problem, headers?: HeadersInit): Response {
  const h = new Headers(headers);
  h.set("Content-Type", PROBLEM_CONTENT_TYPE);
  return new Response(JSON.stringify(body), { status: body.status, headers: h });
}

export const isProblemResponse = (response: Response) =>
  response.headers.get("Content-Type")?.startsWith(PROBLEM_CONTENT_TYPE) ?? false;
