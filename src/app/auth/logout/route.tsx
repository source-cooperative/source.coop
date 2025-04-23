import { CONFIG } from "@/lib/config";
import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const returnTo = new URL(request.url);
  return NextResponse.redirect(
    `${CONFIG.auth.routes.logout}?return_to=${returnTo.origin}`,
    302
  );
}
