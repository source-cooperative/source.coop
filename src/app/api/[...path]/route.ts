import { NextRequest } from "next/server";
import { withProblems } from "@/lib/api/handler";
import { problem, problemResponse } from "@/lib/api/problems";

// Next resolves every more specific /api route first, so this only answers
// paths no route claims — with a problem, rather than the app's HTML 404 page.
const notFound = withProblems(async (request: NextRequest) =>
  problemResponse(problem("not_found", `No API route at ${request.nextUrl.pathname}`))
);

export {
  notFound as GET,
  notFound as POST,
  notFound as PUT,
  notFound as PATCH,
  notFound as DELETE,
  notFound as HEAD,
  notFound as OPTIONS,
};
