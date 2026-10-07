import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { UserSession } from "@/types";
import { LOGGER } from "@/lib/logging";
import { getApiSession } from "./utils";
import { OperationError, OperationResult } from "@/lib/operations/result";

const STATUS: Record<OperationError, number> = {
  invalid: StatusCodes.BAD_REQUEST,
  unauthenticated: StatusCodes.UNAUTHORIZED,
  forbidden: StatusCodes.FORBIDDEN,
  not_found: StatusCodes.NOT_FOUND,
  conflict: StatusCodes.CONFLICT,
};

const errorResponse = (
  code: string,
  message: string,
  status: number,
  field_errors?: Record<string, string[]>
) => NextResponse.json({ error: { code, message, field_errors } }, { status });

/** The route adapter: an operation's result as an HTTP response. */
export function toResponse<T>(
  result: OperationResult<T>,
  status: number = StatusCodes.OK
): Response {
  if (!result.ok) {
    return errorResponse(
      result.error,
      result.message,
      STATUS[result.error],
      result.fieldErrors
    );
  }
  return NextResponse.json(result.value, { status });
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
 * the awaited path params, the parsed JSON body, and a logged 500 for
 * anything thrown.
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
        return errorResponse(
          "invalid",
          "Request body is not valid JSON",
          StatusCodes.BAD_REQUEST
        );
      }
      return await handler({ request, session, params: await params, body });
    } catch (error) {
      LOGGER.error("Unhandled API error", {
        operation: `${request.method} ${request.nextUrl.pathname}`,
        error,
      });
      return errorResponse(
        "internal",
        "Internal server error",
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  };
}
