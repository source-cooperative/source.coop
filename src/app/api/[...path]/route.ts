import { NextRequest } from "next/server";
import { problem, problemResponse } from "@/lib/api/problems";

// Next resolves every more specific /api route first, so this only answers
// paths no route claims — with a problem, rather than the app's HTML 404 page.
function notFound(request: NextRequest) {
  const { pathname } = request.nextUrl;
  return problemResponse(
    problem("not_found", `No API route at ${pathname}`, { instance: pathname }),
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
