import { NextRequest, NextResponse } from "next/server";
import { Actions, RedactedAPIKey, RedactedAPIKeySchema } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { apiKeysTable } from "@/lib/clients/database";
import {
  LEGACY_API_KEY_DEPRECATION,
  legacyApiKeysGone,
} from "@/lib/api/legacy-api-keys";

/**
 * @openapi
 * /accounts/{account_id}/api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Create an API key
 *     deprecated: true
 *     description: Retired. Legacy API keys grant no access, so this route creates nothing. For software that needs access, issue a service account an API key.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       410:
 *         description: Gone - legacy API keys are retired
 */
export const POST = legacyApiKeysGone;

/**
 * @openapi
 * /accounts/{account_id}/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List your API keys
 *     deprecated: true
 *     description: Lists the signed-in account's legacy API keys, without their secrets, so they can be found and deleted. Legacy API keys grant no access. The response carries `Deprecation` and `Sunset` headers; the route is removed after the sunset date.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RedactedAPIKey'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - No account is signed in
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = await params;
    const account = session?.account;
    if (!account) {
      return NextResponse.json(
        { error: `Account with ID ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, account, Actions.ListAccountAPIKeys)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const apiKeys = await apiKeysTable.listByAccount(account.account_id);
    const redactedAPIKeys: RedactedAPIKey[] = [];
    for (const apiKey of apiKeys) {
      if (isAuthorized(session, apiKey, Actions.GetAPIKey)) {
        redactedAPIKeys.push(RedactedAPIKeySchema.parse(apiKey));
      }
    }
    return NextResponse.json(redactedAPIKeys, {
      status: StatusCodes.OK,
      headers: LEGACY_API_KEY_DEPRECATION,
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
