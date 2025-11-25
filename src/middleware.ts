import { createOryMiddleware } from "@ory/nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";
import { LOGGER } from "@/lib";
import { productUrl } from "@/lib/urls";

/**
 * Ignore Chrome DevTools requests by returning 404.
 * https://developer.chrome.com/docs/devtools/automatic-workspaces#how_does_automatic_workspace_connection_work
 * https://stackoverflow.com/a/79630217
 *
 * @param request
 * @returns response or null
 */
const handleChromeDevTools = (request: NextRequest): NextResponse | null => {
  if (
    request.method === "GET" &&
    request.nextUrl.pathname ===
      "/.well-known/appspecific/com.chrome.devtools.json"
  ) {
    return new NextResponse(null, { status: 404 });
  }
  return null;
};

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
      const newPath = productUrl(ownerId, repoId);
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
  for (const handler of [handleLegacyRedirects, handleChromeDevTools, ory]) {
    const response = await handler(request);
    if (response) return response;
  }
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo|favicon).*)"],
};
