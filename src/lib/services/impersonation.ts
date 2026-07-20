import "server-only";

import { cookies } from "next/headers";
import { Actions, type UserSession } from "@/types";
import {
  accountsTable,
  membershipsTable,
  isIndividualAccount,
} from "@/lib/clients/database";
import { isAdmin, isAuthorized } from "@/lib/api/authz";
import { encryptJson, decryptJson } from "@/lib/services/encrypted-cookie";
import { LOGGER } from "@/lib/logging";

/** Encrypted HTTP-only cookie naming the account an admin is viewing as. */
export const IMPERSONATION_COOKIE_NAME = "sc_impersonate";

interface ImpersonationCookie {
  account_id: string;
}

/**
 * Admin-only. Set/clear from a server action (action phase); a Server
 * Component render cannot write cookies. Not gated here — callers verify the
 * real session is an admin first.
 */
export async function setImpersonationTarget(account_id: string): Promise<void> {
  const jar = await cookies();
  jar.set(
    IMPERSONATION_COOKIE_NAME,
    await encryptJson({ account_id } satisfies ImpersonationCookie),
    { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  );
}

export async function clearImpersonationTarget(): Promise<void> {
  const jar = await cookies();
  jar.delete(IMPERSONATION_COOKIE_NAME);
}

/**
 * If the real session is an admin and an impersonation cookie is present,
 * returns a session that fully assumes the target individual account —
 * `identity_id`, `account`, and `memberships` all swapped, `impersonator` set
 * so the UI can render a banner. Otherwise returns `realSession` unchanged.
 *
 * The gate is `isAdmin(realSession)`: a forged cookie from a non-admin is
 * inert, so the encryption is defense-in-depth, not the security boundary.
 * Only individual accounts are assumable — they alone have an Ory identity for
 * the data proxy to mint credentials against.
 */
export async function applyImpersonation(
  realSession: UserSession | null,
): Promise<UserSession | null> {
  if (!realSession || !isAdmin(realSession)) return realSession;

  const jar = await cookies();
  const token = jar.get(IMPERSONATION_COOKIE_NAME)?.value;
  if (!token) return realSession;

  const decoded = await decryptJson<ImpersonationCookie>(token);
  if (!decoded?.account_id) return realSession;

  const target = await accountsTable.fetchById(decoded.account_id);
  if (!target || target.disabled || !isIndividualAccount(target)) {
    return realSession;
  }

  const principal: UserSession = {
    orySession: realSession.orySession,
    account: target,
    identity_id: target.identity_id,
  };
  const memberships = (
    await membershipsTable.listByUser(target.account_id)
  ).filter((membership) =>
    isAuthorized(principal, membership, Actions.GetMembership),
  );

  LOGGER.info("Admin viewing app as another user", {
    operation: "applyImpersonation",
    context: "impersonation",
    metadata: {
      admin: realSession.account?.account_id,
      target: target.account_id,
    },
  });

  return {
    identity_id: target.identity_id,
    account: target,
    memberships,
    orySession: realSession.orySession,
    impersonator: {
      account_id: realSession.account!.account_id,
      name: realSession.account!.name,
    },
  };
}
