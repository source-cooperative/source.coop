import { NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";

/**
 * Legacy API keys (the `api-keys` table) grant no access: the data proxy takes
 * only identity tokens at `/.sts`, and this API only the proxy's signed tokens
 * and session cookies. Their list and delete routes serve for one more
 * release, so owners can find and delete their keys, and announce their
 * removal in `Deprecation` (RFC 9745) and `Sunset` (RFC 8594).
 */
export const LEGACY_API_KEY_DEPRECATION = {
  Deprecation: "@1790294400", // 2026-09-25T00:00:00Z
  Sunset: "Sun, 01 Nov 2026 00:00:00 GMT",
};

/** The answer of every legacy API key route that no longer serves. */
export function legacyApiKeysGone() {
  return NextResponse.json(
    {
      error:
        "Legacy API keys are retired and grant no access. For software that needs access, create a service account in your account settings and issue it an API key.",
    },
    { status: StatusCodes.GONE }
  );
}
