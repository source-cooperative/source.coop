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
    /**
     * The key's last six characters — its checksum — to tell which key is
     * which. A checksum of the key's 178 random bits narrows them by 32,
     * leaving far too many to guess. It confirms a key in hand against this
     * record, and is never used to look one up, since keys may share it.
     * Four characters on keys issued before keys carried a checksum; absent
     * on keys issued before it was recorded.
     */
    hint: z
      .string()
      .regex(/^([0-9A-Za-z]{6}|[A-Za-z0-9_-]{4})$/)
      .optional(),
    created_at: z.string().datetime(),
    created_by: z.string(),
    /** Null for a key that lasts until revoked. */
    expires_at: z.string().datetime().nullable(),
    revoked_at: z.string().datetime().optional(),
    /**
     * Who revoked the key: an `owner` in settings, a `holder` presenting it to
     * the revocation endpoint, or `github` secret scanning finding it in
     * public. Absent on keys revoked before it was recorded.
     */
    revoked_via: z.enum(["owner", "holder", "github"]).optional(),
    /**
     * The account that revoked the key, when an `owner` did: the signed-in
     * person, not the service account. A `holder` is anonymous and GitHub is
     * no account, so neither sets it.
     */
    revoked_by: z.string().optional(),
    last_used_at: z.string().datetime().optional(),
  })
  .openapi("ServiceAccountKey");

export type ServiceAccountKey = z.infer<typeof ServiceAccountKeySchema>;

export type RevokedVia = NonNullable<ServiceAccountKey["revoked_via"]>;

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
 * Every key is `sck_`, 30 random base62 characters, and six more that are
 * their checksum: a fixed 40 characters, GitHub's own token layout (ADR-013).
 * The pattern is what secret scanners register; the checksum lets anything
 * holding a key refuse one that was cut short or mistyped without a lookup.
 */
export const API_KEY_PREFIX = "sck_";
export const API_KEY_PATTERN = /^sck_[0-9A-Za-z]{36}$/;
export const API_KEY_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * The six characters that end a key: the CRC-32 of its 30 random characters
 * (IEEE, as zlib computes it), in base62, most significant digit first. It is
 * computed here rather than with `zlib` because this module is also bundled
 * for the browser.
 */
export function apiKeyChecksum(body: string): string {
  let crc = ~0;
  for (let i = 0; i < body.length; i++) {
    crc ^= body.charCodeAt(i);
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  let n = ~crc >>> 0;
  let digits = "";
  for (let i = 0; i < 6; i++, n = Math.floor(n / 62)) digits = API_KEY_ALPHABET[n % 62] + digits;
  return digits;
}

/** Whether a string is exactly a key: the pattern, and a checksum that holds. */
export const isApiKey = (token: string) =>
  API_KEY_PATTERN.test(token) && token.slice(-6) === apiKeyChecksum(token.slice(4, 34));

/** How a key is shown once it is no longer in hand: `sck_…Xy9QeT`, or null without a hint. */
export const maskedApiKey = (key: Pick<ServiceAccountKey, "hint">) =>
  key.hint ? `${API_KEY_PREFIX}…${key.hint}` : null;

/** Whether a key may still be exchanged: not revoked, and not past its expiry. */
export const isKeyActive = (key: ServiceAccountKey, now = Date.now()): boolean =>
  !key.revoked_at &&
  (key.expires_at === null || Date.parse(key.expires_at) > now);
