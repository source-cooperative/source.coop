import { CONFIG, LOGGER } from "@/lib";
import { NextRequest, NextResponse } from "next/server";
import { PROXY_CREDS_COOKIE_NAME } from "@/lib/services/proxy-credentials-shared";

export async function GET(request: NextRequest) {
  const returnTo = new URL(request.url).origin;
  const url = new URL(CONFIG.auth.routes.logout);
  url.searchParams.set("return_to", returnTo);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: request.headers.get("cookie") || "",
    },
  });
  if (!response.ok) {
    LOGGER.error("Logout failed", {
      operation: "logout.GET",
      context: "logout request",
      error: new Error(`HTTP ${response.status}: ${response.statusText}`),
      metadata: {
        status: response.status,
        statusText: response.statusText,
      },
    });
    return NextResponse.json(
      {
        error: "Logout failed",
        status: response.status,
        text: await response.text(),
      },
      { status: response.status }
    );
  }
  const data = await response.json();
  const res = NextResponse.redirect(data.logout_url, 302);
  // Drop the cached proxy credentials so the next user on this browser starts
  // clean. (A returned NextResponse ignores cookies().delete(), so expire it
  // directly on the response.) Mirror the attributes it was set with in
  // proxy-credentials-cache.ts — on HTTPS a clearing Set-Cookie that omits
  // `secure` can be ignored, leaving the cookie alive until its own maxAge.
  res.cookies.set(PROXY_CREDS_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  });
  return res;
}
