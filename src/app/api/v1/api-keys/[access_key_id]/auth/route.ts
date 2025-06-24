/**
 * @openapi
 * /api-keys/{access_key_id}/auth:
 *   post:
 *     tags: [API Keys, Authentication]
 *     summary: Authenticate with API key
 *     description: Authenticates a request using an API key and returns the associated account information.
 *     parameters:
 *       - in: path
 *         name: access_key_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The access key ID to authenticate with
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               secret_access_key:
 *                 type: string
 *                 description: The secret access key for authentication
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorized - Invalid API key or secret
 *       404:
 *         description: Not Found - API key not found
 *       500:
 *         description: Internal server error
 */
import { NextResponse } from "next/server";
import { APIKey } from "@/api/types";
import { StatusCodes } from "http-status-codes";
import { NotFoundError, UnauthorizedError } from "@/api/errors";
import { getAPIKey, getAccount } from "@/api/db";

export async function POST(
  request: Request,
  { params }: { params: { access_key_id: string } }
) {
  try {
    const { access_key_id } = params;
    const { secret_access_key } = await request.json();
    const apiKey = await getAPIKey(access_key_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key with ID ${access_key_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (apiKey.secret_access_key !== secret_access_key) {
      return NextResponse.json(
        { error: "Invalid API key or secret" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    if (apiKey.disabled) {
      return NextResponse.json(
        { error: "API key is disabled" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const account = await getAccount(apiKey.account_id);
    if (!account) {
      return NextResponse.json(
        { error: "Associated account not found" },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    return NextResponse.json(account, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
