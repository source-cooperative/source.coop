/**
 * @openapi
 * /secret-scanning/github:
 *   post:
 *     tags: [Accounts]
 *     summary: Revoke the API keys GitHub finds in public
 *     description: |
 *       The endpoint of GitHub's secret-scanning partner program (https://docs.github.com/en/code-security/tutorials/secret-scanning-partner-program). When GitHub finds tokens matching the API-key pattern in public, in a repository, gist, issue or npm package, it posts them here, signed with one of the keys at https://api.github.com/meta/public_keys/secret_scanning. Nothing in the body is read until that signature verifies. Every API key reported is then revoked, exactly as its holder could revoke it, and the answer labels each one for GitHub: `true_positive` for a key that exists, whether revoked now or before, and `false_positive` for one that does not. Tokens that are not API keys are left out.
 *     security: []
 *     parameters:
 *       - in: header
 *         name: Github-Public-Key-Identifier
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: Github-Public-Key-Signature
 *         required: true
 *         description: Base64 DER ECDSA signature, P-256 with SHA-256, of the raw body
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required: [token, type]
 *               properties:
 *                 token:
 *                   type: string
 *                 type:
 *                   type: string
 *                 url:
 *                   type: string
 *                 source:
 *                   type: string
 *     responses:
 *       200:
 *         description: One `{token_raw, token_type, label}` per API key reported
 *       400:
 *         description: Bad Request
 *       401:
 *         description: A signature that is missing, bad, or cannot be checked
 */
import { verify } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { revokeLeakedKey } from "@/lib/accounts/service-account-keys";
import { LOGGER } from "@/lib/logging";
import { API_KEY_PATTERN } from "@/types";

const GITHUB_KEYS_URL = "https://api.github.com/meta/public_keys/secret_scanning";

// url and source are only logged: an odd one must not cost a batch its revocations.
const MatchesSchema = z.array(
  z.object({ token: z.string(), type: z.string(), url: z.unknown(), source: z.unknown() })
);

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
    return NextResponse.json({ error: "Unauthorized" }, { status: StatusCodes.UNAUTHORIZED });
  }
  const parsed = MatchesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected an array of matches" },
      { status: StatusCodes.BAD_REQUEST }
    );
  }
  const feedback = await Promise.all(
    parsed.data
      .filter(({ token }) => API_KEY_PATTERN.test(token))
      .map(async ({ token, type, url, source }) => ({
        token_raw: token,
        token_type: type,
        label: (await revokeLeakedKey(token, { via: "github", url, source }))
          ? "true_positive"
          : "false_positive",
      }))
  );
  return NextResponse.json(feedback);
}
