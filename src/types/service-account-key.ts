import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

/**
 * What the app and the UI see of an API key: everything but the hash. The
 * key itself is an opaque secret (ADR-013) shown once at issue and never
 * stored; `key_id` is its public handle for listing, revoking and expiry.
 */
export const ServiceAccountKeySchema = z
  .object({
    key_id: z.string().uuid(),
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
 * The stored row: the public fields plus `key_hash`, the table's partition
 * key — hex SHA-256 of the key — which the data proxy presents to ask whether
 * a key may be exchanged. It never leaves the server; pages strip it with
 * `publicKey` before handing a record to a client component.
 */
export const ServiceAccountKeyRecordSchema = ServiceAccountKeySchema.extend({
  key_hash: z.string().regex(/^[0-9a-f]{64}$/),
});

export type ServiceAccountKeyRecord = z.infer<typeof ServiceAccountKeyRecordSchema>;

export const publicKey = ({ key_hash: _, ...key }: ServiceAccountKeyRecord): ServiceAccountKey => key;

/**
 * Every key is `sck_` + 32 random bytes in base64url: a fixed 47 characters,
 * all entropy after the prefix. The pattern is what secret scanners register.
 */
export const API_KEY_PREFIX = "sck_";
export const API_KEY_PATTERN = /^sck_[A-Za-z0-9_-]{43}$/;

/** Whether a key may still be exchanged: not revoked, and not past its expiry. */
export const isKeyActive = (key: ServiceAccountKey, now = Date.now()): boolean =>
  !key.revoked_at &&
  (key.expires_at === null || Date.parse(key.expires_at) > now);
