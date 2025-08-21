import { getServerSession } from "@ory/nextjs/app";
import { createOryMiddleware } from "@ory/nextjs/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getOryId } from "./lib/ory";
import { accountsTable } from "./lib/clients/database";

// Handle legacy repository redirects
const handleLegacyRedirects = (request: NextRequest): NextResponse | null => {
  if (request.nextUrl.pathname.startsWith("/repositories")) {
    const newPath = request.nextUrl.pathname.replace("/repositories", "");
    return NextResponse.redirect(new URL(newPath || "/", request.url));
  }
  return null;
};

// Handle account onboarding checks
const handleOnboarding = async (
  request: NextRequest,
  oryId: string
): Promise<NextResponse | null> => {
  const account = await accountsTable.fetchByOryId(oryId);

  if (!account && request.nextUrl.pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return null;
};

// Handle email verification for accounts
const handleEmailVerification = async (
  session: any,
  account: any
): Promise<void> => {
  if (
    account &&
    account.emails?.length === 0 &&
    session.identity?.traits.email
  ) {
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
  }
};

export const middleware = async (request: NextRequest) => {
  // Handle legacy redirects first
  const redirect = handleLegacyRedirects(request);
  if (redirect) return redirect;

  // Handle authentication and account management
  const session = await getServerSession();
  if (session) {
    const oryId = getOryId(session);
    if (oryId) {
      // Check onboarding status
      const onboardingRedirect = await handleOnboarding(request, oryId);
      if (onboardingRedirect) return onboardingRedirect;

      // Handle email verification
      const account = await accountsTable.fetchByOryId(oryId);
      await handleEmailVerification(session, account);
    }
  }

  // Run Ory middleware last
  const ory = await createOryMiddleware({});
  return ory(request);
};

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
