/**
 * @openapi
 * /accounts/{account_id}/trusts/exchanges:
 *   post:
 *     tags: [Accounts]
 *     summary: Say whether this account trusts a subject to act as it
 *     description: |
 *       Called by the data proxy at `/.sts` after it has verified a platform IdP's token (GitHub Actions, say) and read the account the caller named in `RoleArn`. Authenticated as that account. Answers whether the account trusts the token's issuer and subject — the trust-policy check of an assume-role call. Nothing else is decided here; the account's memberships are what the credentials then carry.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [issuer, subject]
 *             properties:
 *               issuer:
 *                 type: string
 *               subject:
 *                 type: string
 *     responses:
 *       200:
 *         description: Trusted
 *       400:
 *         description: Bad Request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not trusted
 */
import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { getApiSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";
import { accountTrustsTable } from "@/lib/clients/database";

const BodySchema = z.object({ issuer: z.string().min(1), subject: z.string().min(1) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  const session = await getApiSession(request);
  const { account_id } = await params;
  // Only the account itself — the proxy, calling as it — may ask.
  if (!session?.account || (session.account.account_id !== account_id && !isAdmin(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: StatusCodes.UNAUTHORIZED });
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "issuer and subject are required" },
      { status: StatusCodes.BAD_REQUEST }
    );
  }
  const { issuer, subject } = parsed.data;
  const trusted = await accountTrustsTable.isTrusted(account_id, issuer, subject);
  return NextResponse.json({ trusted }, { status: trusted ? StatusCodes.OK : StatusCodes.FORBIDDEN });
}
