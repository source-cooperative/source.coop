import { verify } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revokeLeakedKey } from "@/lib/accounts/service-account-keys";
import { LOGGER } from "@/lib/logging";
import { isApiKey } from "@/types";
import { toResponse } from "@/lib/api/handler";
import { errors, internal, json, registry } from "@/lib/api/openapi";
import { invalid, unauthenticated } from "@/lib/operations/result";

const GITHUB_KEYS_URL = "https://api.github.com/meta/public_keys/secret_scanning";

// url and source are only logged: an odd one must not cost a batch its revocations.
const MatchesSchema = z.array(
  z.object({
    token: z.string(),
    type: z.string(),
    url: z.unknown().openapi({ type: "string" }),
    source: z.unknown().openapi({ type: "string" }),
  })
);

const FeedbackSchema = z.array(
  z.object({
    token_raw: z.string(),
    token_type: z.string(),
    label: z.enum(["true_positive", "false_positive"]),
  })
);

registry.registerPath({
  method: "post",
  path: "/secret-scanning/github",
  ...internal,
  summary: "Revoke the API keys GitHub finds in public",
  description:
    "The endpoint of [GitHub's secret-scanning partner program](https://docs.github.com/en/code-security/tutorials/secret-scanning-partner-program), which only GitHub can call. When GitHub finds tokens matching the API-key pattern in public, in a repository, gist, issue or npm package, it posts them here, signed with one of the keys at https://api.github.com/meta/public_keys/secret_scanning. Nothing in the body is read until that signature verifies. Every API key reported is revoked, exactly as its holder could revoke it, and labelled for GitHub: `true_positive` for a key that exists, whether revoked now or before, and `false_positive` for one that does not. Tokens that are not API keys, including any whose checksum fails, are left out without a lookup. To revoke a key you hold, use `POST /service-account-keys/revocations`.",
  security: [],
  request: {
    headers: z.object({
      "Github-Public-Key-Identifier": z.string(),
      "Github-Public-Key-Signature": z
        .string()
        .openapi({ description: "Base64 DER ECDSA signature, P-256 with SHA-256, of the raw body." }),
    }),
    body: { content: { "application/json": { schema: MatchesSchema } } },
  },
  responses: {
    200: json("One label per API key reported.", FeedbackSchema),
    ...errors(400, 401),
  },
});

// GitHub's signing keys by identifier, for the life of the instance, and when
// they were last fetched or tried.
let githubKeys = new Map<string, string>();
let lastFetchAt = 0;

/**
 * The public key GitHub names `id`. GitHub rotates keys, so an unseen `id`
 * refetches them, but at most every ten minutes: the keys endpoint allows 60
 * unauthenticated requests an hour from an IP, Vercel's egress IPs are shared,
 * and an identifier anyone can forge must not spend them. The time is taken
 * before the fetch, so a failing or concurrent fetch is throttled too.
 */
async function githubKey(id: string): Promise<string | undefined> {
  if (!githubKeys.has(id) && Date.now() - lastFetchAt >= 10 * 60_000) {
    lastFetchAt = Date.now();
    const res = await fetch(GITHUB_KEYS_URL);
    if (!res.ok) throw new Error(`GitHub's secret-scanning keys answered ${res.status}`);
    const { public_keys } = (await res.json()) as {
      public_keys: { key_identifier: string; key: string }[];
    };
    githubKeys = new Map(public_keys.map((k) => [k.key_identifier, k.key]));
  }
  return githubKeys.get(id);
}

/**
 * Whether GitHub signed exactly these bytes. Anything that stops the check, a
 * failed key fetch or a key or signature that will not parse, answers false:
 * the report is refused, never a 500.
 */
async function signedByGitHub(
  id: string | null,
  signature: string | null,
  body: Buffer
): Promise<boolean> {
  try {
    const key = id && signature ? await githubKey(id) : undefined;
    if (key && signature && verify("sha256", body, key, Buffer.from(signature, "base64"))) {
      return true;
    }
    LOGGER.warn("Refused a secret-scanning report GitHub did not sign", {
      operation: "githubSecretScanning",
      metadata: { key_identifier: id },
    });
  } catch (error) {
    LOGGER.warn("Could not check a secret-scanning report's signature", {
      operation: "githubSecretScanning",
      metadata: { key_identifier: id, error: error instanceof Error ? error.message : String(error) },
    });
  }
  return false;
}

export async function POST(request: NextRequest) {
  // The signature covers the bytes as sent, not the JSON they parse to.
  const body = Buffer.from(await request.clone().arrayBuffer());
  const signed = await signedByGitHub(
    request.headers.get("github-public-key-identifier"),
    request.headers.get("github-public-key-signature"),
    body
  );
  if (!signed) {
    return toResponse(unauthenticated());
  }
  const parsed = MatchesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return toResponse(invalid("Expected an array of matches"));
  }
  const feedback = await Promise.all(
    parsed.data
      .filter(({ token }) => isApiKey(token))
      .map(async ({ token, type, url, source }) => ({
        token_raw: token,
        token_type: type,
        label: (await revokeLeakedKey(token, "github", { url, source }))
          ? "true_positive"
          : "false_positive",
      }))
  );
  return NextResponse.json(feedback);
}
