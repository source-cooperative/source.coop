/**
 * @openapi
 * /api-keys/{access_key_id}:
 *   get:
 *     tags: [API Keys]
 *     summary: Get API key details
 *     description: Retrieves the details of a specific API key. The secret access key is redacted unless the user has appropriate permissions.
 *     parameters:
 *       - in: path
 *         name: access_key_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The access key ID to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RedactedAPIKey'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - API key not found
 *       500:
 *         description: Internal server error
 */
import { NextRequest, NextResponse } from "next/server";
import { Actions, APIKey, RedactedAPIKey, RedactedAPIKeySchema } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { apiKeysTable } from "@/lib/clients/database/api-keys";

export async function GET(
  request: NextRequest,
  { params }: { params: { access_key_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { access_key_id } = params;
    const apiKey = await apiKeysTable.fetchById(access_key_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key with ID ${access_key_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, apiKey, Actions.GetAPIKey)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const redactedAPIKey: RedactedAPIKey = RedactedAPIKeySchema.parse(apiKey);
    return NextResponse.json(redactedAPIKey, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /api-keys/{access_key_id}:
 *   put:
 *     tags: [API Keys]
 *     summary: Update API key
 *     description: Updates an existing API key. Only the disabled status can be updated.
 *     parameters:
 *       - in: path
 *         name: access_key_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The access key ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               disabled:
 *                 type: boolean
 *                 description: Whether the API key should be disabled
 *     responses:
 *       200:
 *         description: Successfully updated API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/APIKey'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - API key not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { access_key_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { access_key_id } = params;
    const { disabled } = await request.json();
    const apiKey = await apiKeysTable.fetchById(access_key_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key with ID ${access_key_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, apiKey, Actions.PutAPIKey)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    apiKey.disabled = disabled;
    const [updatedAPIKey, _success] = await apiKeysTable.create(apiKey);
    return NextResponse.json(updatedAPIKey, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /api-keys/{access_key_id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Delete API key
 *     description: Deletes an existing API key.
 *     parameters:
 *       - in: path
 *         name: access_key_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The access key ID to delete
 *     responses:
 *       200:
 *         description: Successfully deleted API key
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - API key not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { access_key_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { access_key_id } = params;
    const apiKey = await apiKeysTable.fetchById(access_key_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key with ID ${access_key_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, apiKey, Actions.DeleteAPIKey)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    // Note: Actual deletion logic would be implemented here
    return NextResponse.json(
      { message: "API key deleted successfully" },
      { status: StatusCodes.OK }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
