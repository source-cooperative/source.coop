import { CONFIG, LOGGER } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

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
  return NextResponse.redirect(data.logout_url, 302);
}
