/**
 * @openapi
 * /service-account-keys/exchanges:
 *   post:
 *     tags: [Accounts]
 *     summary: Say whether an API key may be exchanged, and which service account it belongs to
 *     description: |
 *       Called by the data proxy at `/.sts` when an API key is presented, authenticated as the proxy itself: the key is opaque, so nothing names an account before this lookup. The proxy sends the key's SHA-256; this answers whether the key is active — known, not revoked, not expired, and its service account not disabled — and, if so, which account it is. An unknown hash is answered as inactive, indistinguishable from a revoked one. Records last use. The proxy caches the answer briefly, so revocation takes effect for new exchanges within that TTL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key_hash]
 *             properties:
 *               key_hash:
 *                 type: string
 *                 description: Hex SHA-256 of the key
 *     responses:
 *       200:
 *         description: The key's standing
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 */
import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { PROXY_SELF_SUBJECT, verifyProxyAssertion } from "@/lib/api/oidc";
import { accountsTable, serviceAccountKeysTable } from "@/lib/clients/database";
import { LOGGER } from "@/lib/logging";
import { isKeyActive } from "@/types";

const BodySchema = z.object({ key_hash: z.string().regex(/^[0-9a-f]{64}$/) });

export async function POST(request: NextRequest) {
  // Only the proxy, as itself. Never a session: the sentinel subject resolves
  // to no account, and a cookie must not reach this route.
  const assertion = await verifyProxyAssertion(
    request.headers.get("authorization"),
    new URL(request.url).origin
  );
  if (assertion?.sub !== PROXY_SELF_SUBJECT) {
    return NextResponse.json({ error: "Unauthorized" }, { status: StatusCodes.UNAUTHORIZED });
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "key_hash is required" }, { status: StatusCodes.BAD_REQUEST });
  }

  const request_id = request.headers.get("x-request-id") ?? undefined;
  const key = await serviceAccountKeysTable.fetchByHash(parsed.data.key_hash);
  const account = key ? await accountsTable.fetchById(key.account_id) : null;
  const reason = !key
    ? "unknown"
    : key.revoked_at
      ? "revoked"
      : !isKeyActive(key)
        ? "expired"
        : !account || account.disabled
          ? "disabled"
          : null;
  const meta = { request_id, key_id: key?.key_id, account_id: key?.account_id, reason };
  if (!key || reason) {
    LOGGER.warn("API key not exchangeable", { operation: "serviceAccountKeyExchange", metadata: meta });
    return NextResponse.json({ active: false });
  }

  // Best-effort: a throttled write must not refuse a live key.
  await serviceAccountKeysTable
    .set(key.key_hash, "last_used_at", new Date().toISOString())
    .catch((error: unknown) =>
      LOGGER.warn("Could not record API key use", {
        operation: "serviceAccountKeyExchange",
        metadata: { ...meta, error: error instanceof Error ? error.message : String(error) },
      })
    );
  LOGGER.info("API key exchanged", { operation: "serviceAccountKeyExchange", metadata: meta });
  return NextResponse.json({ account_id: key.account_id, key_id: key.key_id, active: true });
}
