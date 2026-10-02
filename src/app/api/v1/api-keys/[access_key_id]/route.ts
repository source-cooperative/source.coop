import { NextRequest, NextResponse } from "next/server";
import { Actions } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { LEGACY_API_KEY_DEPRECATION } from "@/lib/api/legacy-api-keys";
import { apiKeysTable } from "@/lib/clients/database/api-keys";

/**
 * @openapi
 * /api-keys/{access_key_id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Delete API key
 *     deprecated: true
 *     description: Deletes a legacy API key, secret and all. Legacy API keys grant no access; this route serves until the sunset date so their owners can delete them. The response carries `Deprecation` and `Sunset` headers.
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
  { params }: { params: Promise<{ access_key_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { access_key_id } = await params;
    const apiKey = await apiKeysTable.fetchById(access_key_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key with ID ${access_key_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, apiKey, Actions.RevokeAPIKey)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    await apiKeysTable.delete(apiKey.access_key_id);
    return NextResponse.json(
      { message: "API key deleted successfully" },
      { status: StatusCodes.OK, headers: LEGACY_API_KEY_DEPRECATION }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
