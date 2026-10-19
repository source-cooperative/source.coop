import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PROXY_SELF_SUBJECT, verifyProxyAssertion } from "@/lib/api/oidc";
import { toResponse } from "@/lib/api/handler";
import { bearer, errors, internal, json, registry } from "@/lib/api/openapi";
import { invalid, unauthenticated } from "@/lib/operations/result";
import { accountsTable, serviceAccountKeysTable } from "@/lib/clients/database";
import { LOGGER } from "@/lib/logging";
import { isKeyActive } from "@/types";

const BodySchema = z.object({
  key_hash: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .openapi({ description: "The key's SHA-256, in lowercase hex." }),
});

const AnswerSchema = z.object({
  active: z.boolean(),
  account_id: z
    .string()
    .optional()
    .openapi({ description: "The service account the key signs in as; only when active." }),
  key_id: z.string().optional().openapi({ description: "Only when active." }),
});

registry.registerPath({
  method: "post",
  path: "/service-account-keys/exchanges",
  ...internal,
  summary: "Whether an API key may be exchanged, and for which service account",
  description:
    "Called by the data proxy at `/.sts`, as itself, when an API key is presented: the key is opaque, so nothing names an account before this lookup. A key is active when it is known, not revoked, not expired, no older than its service account, and that account is not disabled; an unknown hash is answered as inactive, indistinguishable from a revoked one. Records the key's last use. The proxy caches the answer briefly, so a revocation stops new exchanges within that time.",
  security: bearer,
  request: { body: { content: { "application/json": { schema: BodySchema } } } },
  responses: {
    200: json("The key's standing.", AnswerSchema),
    ...errors(400, 401),
  },
});

export async function POST(request: NextRequest) {
  // Only the proxy, as itself. Never a session: the sentinel subject resolves
  // to no account, and a cookie must not reach this route.
  const assertion = await verifyProxyAssertion(
    request.headers.get("authorization"),
    new URL(request.url).origin
  );
  if (assertion?.sub !== PROXY_SELF_SUBJECT) {
    return toResponse(unauthenticated());
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return toResponse(invalid("key_hash is required", "key_hash"));
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
          : // Issued to an earlier account that held this id.
            Date.parse(key.created_at) < Date.parse(account.created_at)
            ? "predates account"
            : null;
  const meta = { request_id, key_id: key?.key_id, account_id: key?.account_id, reason };
  if (!key || reason) {
    LOGGER.warn("API key not exchangeable", { operation: "serviceAccountKeyExchange", metadata: meta });
    return NextResponse.json({ active: false });
  }

  // Best-effort and after the response: a throttled write must neither refuse
  // nor delay a live key.
  after(() =>
    serviceAccountKeysTable
      .set(key.key_hash, "last_used_at", new Date().toISOString())
      .catch((error: unknown) =>
        LOGGER.warn("Could not record API key use", {
          operation: "serviceAccountKeyExchange",
          metadata: { ...meta, error: error instanceof Error ? error.message : String(error) },
        })
      )
  );
  LOGGER.info("API key exchanged", { operation: "serviceAccountKeyExchange", metadata: meta });
  return NextResponse.json({ account_id: key.account_id, key_id: key.key_id, active: true });
}
