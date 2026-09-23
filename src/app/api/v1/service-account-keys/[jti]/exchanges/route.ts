/**
 * @openapi
 * /service-account-keys/{jti}/exchanges:
 *   post:
 *     tags: [Accounts]
 *     summary: Record that an API key was presented, and say whether it may be exchanged
 *     description: |
 *       Called by the data proxy at `/.sts` when a token carrying this `jti` is presented, as the service account the key belongs to. Records the use and answers whether the key is still active — not revoked, not expired. The proxy caches the answer briefly, so revocation takes effect for new exchanges within that TTL.
 *     parameters:
 *       - in: path
 *         name: jti
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The key's standing
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not Found
 */
import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { getApiSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";
import { serviceAccountKeysTable } from "@/lib/clients/database";
import { isKeyActive } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jti: string }> }
) {
  const session = await getApiSession(request);
  const { jti } = await params;
  const key = await serviceAccountKeysTable.fetchByJti(jti);
  if (!key) {
    return NextResponse.json({ error: "No such key" }, { status: StatusCodes.NOT_FOUND });
  }
  // Only the account the key belongs to — the proxy, calling as it — may ask.
  if (!session?.account || (session.account.account_id !== key.account_id && !isAdmin(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: StatusCodes.UNAUTHORIZED });
  }
  const active = isKeyActive(key);
  if (active) {
    await serviceAccountKeysTable.set(jti, "last_used_at", new Date().toISOString());
  }
  return NextResponse.json({
    account_id: key.account_id,
    active,
    expires_at: key.expires_at,
    revoked_at: key.revoked_at ?? null,
  });
}
