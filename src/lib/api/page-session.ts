import "server-only";

import {
  FrontendApi,
  Configuration,
  ResponseError,
  type Session,
} from "@ory/client-fetch";
import { getServerSession } from "@ory/nextjs/app";
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
 * Whether a Cookie header carries an Ory session cookie (`ory_session_<project>`
 * on Ory Network, `ory_kratos_session` self-hosted). Matches the cookie's name,
 * not its value.
 *
 * ponytail: name heuristic. If Ory renames the cookie, every visitor reads as
 * signed out until this pattern follows.
 */
export function hasOrySessionCookie(
  cookie: string | null | undefined,
): cookie is string {
  return !!cookie
    ?.split(";")
    .some((c) => /ory\w*session/i.test(c.split("=")[0]));
}

/**
 * The Ory session for this request, or null. Skips the whoami round trip to
 * Ory when the request carries no session cookie: anonymous visitors and
 * crawlers can't have a session, so the answer is always null for them.
 */
export async function getOrySession(): Promise<Session | null> {
  if (!hasOrySessionCookie((await headers()).get("cookie"))) return null;
  return getServerSession();
}

/**
 * Signs the user out when Ory wants their session stepped up to AAL2.
 *
 * `whoami` 403s with `session_aal2_required` when an AAL1 session belongs to an
 * identity Ory expects at AAL2 (e.g. a second factor is configured). That state
 * never clears on refresh — the same AAL1 cookie is resent — so we redirect to
 * /logout to clear it. @ory/nextjs `getServerSession` collapses this 403 to
 * null, so we re-check it here with a client that surfaces the error.
 *
 * Lives in a `server-only` module because it imports next/headers; it must
 * never be reachable from a client component. `@/lib/api/utils` (and so the
 * `@/lib` barrel) imports this module, so client components import from the
 * specific `@/lib/*` modules, never the barrel.
 */
export async function redirectIfStepUpRequired(): Promise<void> {
  const cookie = (await headers()).get("cookie");
  // No Ory session cookie → definitely not the stuck-AAL1 case; skip the whoami.
  if (!hasOrySessionCookie(cookie)) return;

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
