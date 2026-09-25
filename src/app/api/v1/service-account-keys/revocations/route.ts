/**
 * @openapi
 * /service-account-keys/revocations:
 *   post:
 *     tags: [Accounts]
 *     summary: Revoke an API key by presenting it
 *     description: |
 *       Revokes a service account's API key for anyone who holds it, its owner or a stranger who found it where it should not be, without signing in: holding the key is the only proof asked for. The key goes in the JSON body; a key in the query string is refused before any lookup, because request URLs are logged. The answer is the same 204 whether the key was live, already revoked or never existed, so this cannot be used to test a key. The data proxy refuses new exchanges of the key once its cached answer lapses, within a minute.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key]
 *             properties:
 *               key:
 *                 type: string
 *                 description: The API key, `sck_` and 43 more characters
 *     responses:
 *       204:
 *         description: The key, if it exists, is revoked
 *       400:
 *         description: No API key in the body, or a key in the query string
 */
import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { revokeLeakedKey } from "@/lib/accounts/service-account-keys";
import { API_KEY_PATTERN, API_KEY_PREFIX } from "@/types";

// Trimmed first: a key copied out of a file carries its newline.
const BodySchema = z.object({ key: z.string().trim().regex(API_KEY_PATTERN) });

export async function POST(request: NextRequest) {
  if (request.nextUrl.search.includes(API_KEY_PREFIX)) {
    return NextResponse.json(
      { error: "Send the key in the request body, not the URL" },
      { status: StatusCodes.BAD_REQUEST }
    );
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "key is required, as an sck_ API key" },
      { status: StatusCodes.BAD_REQUEST }
    );
  }
  await revokeLeakedKey(parsed.data.key, { via: "self-revoke" });
  return new NextResponse(null, { status: StatusCodes.NO_CONTENT });
}
