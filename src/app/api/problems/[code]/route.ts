import { NextRequest } from "next/server";
import { htmlResponse, isProblemCode, problemPage } from "@/lib/api/problem-pages";
import { withProblems } from "@/lib/api/handler";
import { problem, problemResponse } from "@/lib/api/problems";

// A problem's `type` URL. It names the kind of failure, so it resolves to the
// page that explains it.
export const GET = withProblems(
  async (request: NextRequest, { params }: { params: Promise<{ code: string }> }) => {
    const { code } = await params;
    if (!isProblemCode(code)) {
      return problemResponse(problem("not_found", `No problem type ${code}`));
    }
    return htmlResponse(problemPage(code, request.nextUrl.origin));
  }
);
