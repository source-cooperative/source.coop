import { CONFIG } from "@/lib/config";
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
    console.error("Logout failed", response.status, response.statusText);
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
