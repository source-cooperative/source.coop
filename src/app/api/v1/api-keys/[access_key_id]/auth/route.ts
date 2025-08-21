/**
 * @openapi
 * /api-keys/{access_key_id}/auth:
 *   get:
 *     tags: [API Keys, Authentication]
 *     summary: Fetch API Key details
 *     description: Authenticates a request using an API key and returns the associated API key details.
 *     parameters:
 *       - in: path
 *         name: access_key_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The access key ID to authenticate with
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema:
 *           type: string
 *         description: The authorization header containing the source key
 *     responses:
 *       200:
 *         description: Successfully fetched API key details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiKey'
 *       401:
 *         description: Unauthorized - Invalid authorization header or API key is disabled
 *       404:
 *         description: Not Found - API key not found
 */
import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { apiKeysTable } from "@/lib/clients/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ access_key_id: string }> }
) {
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return NextResponse.json(
        { error: "Authorization header is required" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    if (authorization !== process.env.SOURCE_KEY) {
      return NextResponse.json(
        { error: "Invalid authorization header" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }

    const { access_key_id } = await params;
    const apiKey = await apiKeysTable.fetchById(access_key_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key with ID ${access_key_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (apiKey.disabled) {
      return NextResponse.json(
        { error: "API key is disabled" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    return NextResponse.json(apiKey, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
