import { getServerSession } from "@ory/nextjs/app";
import { createOryMiddleware } from "@ory/nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getOryId } from "./lib/ory";
import { accountsTable } from "./lib/clients/database";

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
      return NextResponse.redirect(
        new URL(`/${ownerId}/${repoId}`, request.url)
      );
    }
  }
  return null;
};

/**
 * Send authenticated users to the onboarding page if they don't have an account.
 * @param request
 * @returns response or null
 */
const handleOnboarding = async (
  request: NextRequest
): Promise<NextResponse | null> => {
  if (request.nextUrl.pathname !== "/onboarding") return null;

  const session = await getServerSession();
  if (!session) return null;
  const oryId = getOryId(session);
  if (!oryId) return null;
  const account = await accountsTable.fetchByOryId(oryId);

  if (!account) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return null;
};

/**
 * Ensure that authenticated users have an email address.
 * @param request
 * @returns void
 */
const handleEmailVerification = async (request: NextRequest): Promise<void> => {
  const session = await getServerSession();
  if (!session) return;
  const oryId = getOryId(session);
  if (!oryId) return;
  const account = await accountsTable.fetchByOryId(oryId);

  if (!account) return;
  if (!account.emails) return;
  if (account.emails.length > 0) return;
  if (!session.identity?.traits.email) return;

  account.emails = [
    {
      address: session.identity.traits.email,
      verified: false,
      is_primary: true,
      added_at: new Date().toISOString(),
    },
  ];

  try {
    await accountsTable.update(account);
  } catch (error) {
    console.error("Failed to add email to account", error);
  }
};

export const middleware = async (request: NextRequest) => {
  // Handle legacy redirects first
  const redirect = handleLegacyRedirects(request);
  if (redirect) return redirect;

  // Handle authentication and account management
  // const onboardingRedirect = await handleOnboarding(request);
  await handleEmailVerification(request);

  // Run Ory middleware last
  const ory = await createOryMiddleware({});
  return ory(request);
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo|favicon).*)"],
};
