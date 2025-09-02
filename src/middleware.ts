import { getServerSession } from "@ory/nextjs/app";
import { createOryMiddleware } from "@ory/nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getOryId, accountsTable, LOGGER } from "@/lib";

/**
 * Handle requests to legacy repository description paths.
 * @param request
 * @returns response or null
 */
const handleLegacyRedirects = (request: NextRequest): NextResponse | null => {
  if (request.nextUrl.pathname.startsWith("/repositories")) {
    // Handle the specific pattern: /repositories/[owner_id]/[repo_id]/description
    const pathParts = request.nextUrl.pathname.split("/");

    if (
      pathParts.length >= 5 &&
      ["description", "access"].includes(pathParts[4])
    ) {
      // Extract owner_id and repo_id from the path
      // pathParts[0] = "" (empty due to leading slash)
      // pathParts[1] = "repositories"
      // pathParts[2] = owner_id
      // pathParts[3] = repo_id
      // pathParts[4] = "description" or "access"
      const ownerId = pathParts[2];
      const repoId = pathParts[3];
      const newPath = `/${ownerId}/${repoId}`;
      LOGGER.debug("Redirecting to new path", {
        operation: "handle_legacy_redirects",
        context: __filename,
        metadata: {
          oldPath: request.nextUrl.pathname,
          newPath,
        },
      });
      return NextResponse.redirect(new URL(newPath, request.url));
    }
  }
  return null;
};

const ory = createOryMiddleware({});

export const middleware = async (request: NextRequest) => {
  // Handle legacy redirects first
  const redirect = handleLegacyRedirects(request);
  if (redirect) return redirect;

  // Run Ory middleware last
  return ory(request);
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo|favicon).*)"],
};
