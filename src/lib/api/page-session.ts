import "server-only";

import {
  FrontendApi,
  Configuration,
  ResponseError,
} from "@ory/client-fetch";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CONFIG } from "@/lib/config";

// ponytail: reimplements @ory/nextjs's one-line client because its
// `getServerSession` hard-catches every error into null — including the one we
// need to branch on.
const oryFrontend = new FrontendApi(
  new Configuration({
    basePath: CONFIG.auth.api.backendUrl,
    headers: { Accept: "application/json" },
  }),
);

/**
 * Signs the user out when Ory wants their session stepped up to AAL2.
 *
 * `whoami` 403s with `session_aal2_required` when an AAL1 session belongs to an
 * identity Ory expects at AAL2 (e.g. a second factor is configured). That state
 * never clears on refresh — the same AAL1 cookie is resent — so we redirect to
 * /logout to clear it. @ory/nextjs `getServerSession` collapses this 403 to
 * null, so we re-check it here with a client that surfaces the error.
 *
 * Lives in a `server-only` module (not the @/lib barrel) because it imports
 * next/headers; it must never be reachable from a client component.
 */
export async function redirectIfStepUpRequired(): Promise<void> {
  const cookie = (await headers()).get("cookie");
  // No Ory session cookie → definitely not the stuck-AAL1 case; skip the whoami.
  // ponytail: name heuristic (ory_session_* / ory_kratos_session). If Ory renames
  // the cookie this just stops short-circuiting — the probe below still works.
  if (!cookie || !/ory[\w]*session/i.test(cookie)) return;

  try {
    await oryFrontend.toSession({ cookie });
  } catch (err) {
    if (err instanceof ResponseError && err.response.status === 403) {
      const body = await err.response.json().catch(() => null);
      if (body?.error?.id === "session_aal2_required") {
        redirect("/logout"); // throws NEXT_REDIRECT
      }
    }
    // Any other error (401 / network) is handled by the normal session path.
  }
}
