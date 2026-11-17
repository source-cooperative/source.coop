import { htmlResponse, problemIndexPage } from "@/lib/api/problem-pages";

// Lists every problem type the API answers, each linking to its own page.
export function GET() {
  return htmlResponse(problemIndexPage());
}
