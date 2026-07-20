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
  if (request.nextUrl.pathname === "/featured") {
    return NextResponse.redirect(new URL("/products?featured=1", request.url));
  }

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

// Top-level routes that share the /{segment}/{segment} shape but are not
// account/product pages — the analytics rewrite must leave them alone.
const NON_ACCOUNT_SEGMENTS = new Set([
  "admin",
  "edit",
  "email-verified",
  "feed.xml",
  "featured",
  "logout",
  "onboarding",
  "products",
  "repositories",
]);

/**
 * Serve the maintainer analytics view on the product root via a query param
 * (`/{account}/{product}?tab=analytics`). Layouts can't read search params,
 * so the view lives at the internal `/-/analytics` route (which also keeps
 * it from shadowing real object paths) and the query-param URL is rewritten
 * to it here. Other params (e.g. `window`) pass through.
 *
 * Exported for tests: the failure mode is a silently dead ANALYTICS tab.
 */
export const handleProductAnalyticsTab = (
  request: NextRequest,
): NextResponse | null => {
  const { pathname, searchParams } = request.nextUrl;
  const match = pathname.match(/^\/([^/]+)\/[^/]+$/);
  if (
    searchParams.get("tab") === "analytics" &&
    match &&
    !NON_ACCOUNT_SEGMENTS.has(match[1])
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `${pathname}/-/analytics`;
    url.searchParams.delete("tab");
    return NextResponse.rewrite(url);
  }
  return null;
};

const ory = createOryMiddleware({});

// Paths the Ory middleware proxies (self-service flows, session checks). For
// everything else it returns a no-op NextResponse.next().
// See node_modules/@ory/nextjs/dist/middleware (proxyRequest match list).
const ORY_PROXIED_PREFIXES = [
  "/self-service",
  "/sessions/whoami",
  "/ui",
  "/.well-known/ory",
  "/.ory",
];

export const middleware = async (request: NextRequest) => {
  for (const handler of [handleLegacyRedirects, handleChromeDevTools]) {
    const response = await handler(request);
    if (response) return response;
  }

  // Let Ory handle its own endpoints (it returns proxied responses with
  // redirects / Set-Cookie that we must not discard). This runs before the
  // analytics rewrite so two-segment Ory paths (e.g. /sessions/whoami) can
  // never be diverted by a stray ?tab=analytics.
  if (
    ORY_PROXIED_PREFIXES.some((prefix) =>
      request.nextUrl.pathname.startsWith(prefix),
    )
  ) {
    return ory(request);
  }

  const analyticsRewrite = handleProductAnalyticsTab(request);
  if (analyticsRewrite) return analyticsRewrite;

  return NextResponse.next();
};

export const config = {
  // Exclusions are anchored as directories/files — an unanchored prefix
  // (e.g. `api`) would also skip middleware for any account whose id merely
  // starts with it (apiuser, logophile, …), silently disabling rewrites
  // and Ory handling on their pages.
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon\\.ico|favicon/|logo/).*)",
  ],
};
