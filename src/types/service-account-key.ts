import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/**
 * The record behind an API key. The key itself — a JWT the data proxy signs
 * with this record's `jti` as its id (ADR-013) — is shown once at issue and
 * never stored; this row is what revocation and expiry act on.
 */
export const ServiceAccountKeySchema = z
  .object({
    jti: z.string().uuid(),
    account_id: z.string(),
    label: z.string().min(1).max(64),
    created_at: z.string().datetime(),
    created_by: z.string(),
    /** Null for a key that lasts until revoked. */
    expires_at: z.string().datetime().nullable(),
    revoked_at: z.string().datetime().optional(),
    last_used_at: z.string().datetime().optional(),
  })
  .openapi("ServiceAccountKey");

export type ServiceAccountKey = z.infer<typeof ServiceAccountKeySchema>;

/**
 * Every key starts with this. A JWT always begins `eyJ`, so a leaked key
 * matches `sck_eyJ[\w-]+\.[\w-]+\.[\w-]+` — the pattern to register with
 * secret scanners. The proxy strips the prefix before verifying.
 */
export const API_KEY_PREFIX = "sck_";

/** Whether a key may still be exchanged: not revoked, and not past its expiry. */
export const isKeyActive = (key: ServiceAccountKey, now = Date.now()): boolean =>
  !key.revoked_at &&
  (key.expires_at === null || Date.parse(key.expires_at) > now);
