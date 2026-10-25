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
 * Where a problem happened: the request's path, and the platform's request ID
 * when it gives one (Vercel's `x-vercel-id`, which finds the request in its
 * logs).
 */
function occurrence(request: NextRequest): Partial<Problem> {
  const request_id = request.headers.get("x-vercel-id") ?? undefined;
  return { instance: request.nextUrl.pathname, ...(request_id && { request_id }) };
}

/** `response`, with where it happened added if it is a problem. */
async function withOccurrence(response: Response, request: NextRequest) {
  if (!isProblemResponse(response)) return response;
  const body = (await response.json()) as Problem;
  return problemResponse({ ...body, ...occurrence(request) }, response.headers);
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
 * the awaited path params, the parsed JSON body, a logged 500 for anything
 * thrown, and the `instance` and `request_id` of any problem it answers.
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
  return async (
    request: NextRequest,
    { params }: { params: Promise<P> }
  ): Promise<Response> => {
    try {
      const session =
        READS.has(request.method) || request.headers.has("Authorization")
          ? await getApiSession(request)
          : null;
      const text = READS.has(request.method) ? "" : await request.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        return problemResponse(
          problem("invalid", "Request body is not valid JSON", occurrence(request))
        );
      }
      return await withOccurrence(
        await handler({ request, session, params: await params, body }),
        request
      );
    } catch (error) {
      LOGGER.error("Unhandled API error", {
        operation: `${request.method} ${request.nextUrl.pathname}`,
        error,
      });
      return problemResponse(
        problem("internal", "Internal server error", occurrence(request))
      );
    }
  };
}
