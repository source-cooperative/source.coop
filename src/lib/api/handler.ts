import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { UserSession } from "@/types";
import { LOGGER } from "@/lib/logging";
import { getApiSession } from "./utils";
import { OperationResult } from "@/lib/operations/result";
import {
  InputSource,
  isProblemResponse,
  Problem,
  problem,
  problemResponse,
  toFieldProblems,
} from "./problems";

/**
 * The route adapter: an operation's result as an HTTP response. A failure is
 * an RFC 9457 problem; `input` says whether the operation was given the body
 * or the query string, so its field errors name the fields the right way.
 */
export function toResponse<T>(
  result: OperationResult<T>,
  status: number = StatusCodes.OK,
  input: InputSource = "body"
): Response {
  if (!result.ok) {
    const errors =
      result.fieldErrors && Object.keys(result.fieldErrors).length
        ? toFieldProblems(result.fieldErrors, input)
        : undefined;
    return problemResponse(problem(result.error, result.message, { errors }));
  }
  return NextResponse.json(result.value, { status });
}

/**
 * `body` as it happened at `request`: its `type` and `instance` as absolute
 * URLs on the request's own origin, and the platform's request ID when it
 * gives one (Vercel's `x-vercel-id`, which finds the request in its logs).
 */
function problemAt(request: NextRequest, body: Problem, headers?: HeadersInit) {
  const { origin, pathname } = request.nextUrl;
  const request_id = request.headers.get("x-vercel-id") ?? undefined;
  return problemResponse(
    {
      ...body,
      type: new URL(body.type, origin).href,
      instance: origin + pathname,
      ...(request_id && { request_id }),
    },
    headers
  );
}

/** `response`, as it happened at `request` if it is a problem. */
async function withOccurrence(response: Response, request: NextRequest) {
  if (!isProblemResponse(response)) return response;
  return problemAt(request, (await response.json()) as Problem, response.headers);
}

/**
 * Wraps a route handler so that every problem it answers is placed at the
 * request (`problemAt`), and anything it throws is a logged `internal`
 * problem. `withApiSession` is built on it; a route that authenticates its
 * caller itself wraps its handler in this directly.
 */
export function withProblems<C>(
  handler: (request: NextRequest, context: C) => Promise<Response>
) {
  return async (request: NextRequest, context: C): Promise<Response> => {
    try {
      return await withOccurrence(await handler(request, context), request);
    } catch (error) {
      LOGGER.error("Unhandled API error", {
        operation: `${request.method} ${request.nextUrl.pathname}`,
        error,
      });
      return problemAt(request, problem("internal", "Internal server error"));
    }
  };
}

interface ApiContext<P> {
  request: NextRequest;
  session: UserSession | null;
  params: P;
  /** The parsed JSON body, or undefined when the request has none. */
  body: unknown;
}

const READS = new Set(["GET", "HEAD"]);

/**
 * Wraps a route handler with the parts every API route shares: the session,
 * the awaited path params, the parsed JSON body, and `withProblems`.
 *
 * A request that changes something must carry a bearer token. The cookie
 * fallback in `getApiSession` exists for the app's own reads; a browser
 * session that could POST here would be a cross-site request forgery
 * surface, which server actions are protected from by Next's Origin check
 * and route handlers are not.
 */
export function withApiSession<P = Record<string, never>>(
  handler: (ctx: ApiContext<P>) => Promise<Response>
) {
  return withProblems(async (request, { params }: { params: Promise<P> }) => {
    const session =
      READS.has(request.method) || request.headers.has("Authorization")
        ? await getApiSession(request)
        : null;
    const text = READS.has(request.method) ? "" : await request.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      return problemResponse(problem("invalid", "Request body is not valid JSON"));
    }
    return handler({ request, session, params: await params, body });
  });
}
