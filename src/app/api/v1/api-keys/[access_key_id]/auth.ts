import { NextRequest, NextResponse } from "next/server";
import { APIKey } from "@/types";
import { StatusCodes } from "http-status-codes";
import { apiKeysTable } from "@/lib/clients/database/api-keys";

/**
 * @openapi
 * /api-keys/{access_key_id}/auth:
 *   get:
 *     tags: [API Keys]
 *     summary: Get API key details
 *     description: Retrieves API key details using internal authentication.
 *       This endpoint requires the SOURCE_KEY environment variable for authentication.
 *     parameters:
 *       - in: path
 *         name: access_key_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The access key ID to retrieve
 *     security:
 *       - sourceKey: []
 *     responses:
 *       200:
 *         description: Successfully retrieved API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/APIKey'
 *       401:
 *         description: Unauthorized - Invalid or missing SOURCE_KEY
 *       404:
 *         description: Not Found - API key not found or disabled
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ access_key_id: string }> }
) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        { error: "Unauthorized - Missing authorization header" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }

    if (authorization !== process.env.SOURCE_KEY) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid authorization" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }

    const { access_key_id } = await params;

    // Fetch the API key
    const apiKey = await apiKeysTable.fetchById(access_key_id);

    if (!apiKey || apiKey.disabled) {
      return NextResponse.json(
        { error: `API key with ID ${access_key_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }

    // Send the API key as the response
    return NextResponse.json(apiKey, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
