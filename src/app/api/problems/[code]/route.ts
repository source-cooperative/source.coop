import { NextRequest } from "next/server";
import { htmlResponse, isProblemCode, problemPage } from "@/lib/api/problem-pages";
import { occurrence } from "@/lib/api/handler";
import { problem, problemResponse } from "@/lib/api/problems";

// A problem's `type` URL. It names the kind of failure, so it resolves to the
// page that explains it.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!isProblemCode(code)) {
    return problemResponse(problem("not_found", `No problem type ${code}`, occurrence(request)));
  }
  return htmlResponse(problemPage(code));
}
