import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";

// Next resolves every more specific /api route first, so this only answers
// paths no route claims — with JSON, rather than the app's HTML 404 page.
function notFound(request: NextRequest) {
  return NextResponse.json(
    { error: `No API route at ${request.nextUrl.pathname}` },
    { status: StatusCodes.NOT_FOUND },
  );
}

export {
  notFound as GET,
  notFound as POST,
  notFound as PUT,
  notFound as PATCH,
  notFound as DELETE,
  notFound as HEAD,
  notFound as OPTIONS,
};
