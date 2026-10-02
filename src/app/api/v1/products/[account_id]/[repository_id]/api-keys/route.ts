/**
 * @openapi
 * /products/{account_id}/{repository_id}/api-keys:
 *   post:
 *     tags: [API Keys, Products]
 *     summary: Create a new API key
 *     deprecated: true
 *     description: Retired. Legacy API keys grant no access, so this route creates nothing. For software that needs access, issue a service account an API key.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account
 *       - in: path
 *         name: repository_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the repository
 *     responses:
 *       410:
 *         description: Gone - legacy API keys are retired
 */
import { NextRequest, NextResponse } from "next/server";
import { Actions, RedactedAPIKey, RedactedAPIKeySchema } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import {
  LEGACY_API_KEY_DEPRECATION,
  legacyApiKeysGone,
} from "@/lib/api/legacy-api-keys";
import { productsTable } from "@/lib/clients/database/products";
import { apiKeysTable } from "@/lib/clients/database/api-keys";

export const POST = legacyApiKeysGone;

/**
 * @openapi
 * /products/{account_id}/{repository_id}/api-keys:
 *   get:
 *     tags: [API Keys, Products]
 *     summary: List API keys for a repository
 *     deprecated: true
 *     description: Lists the repository's legacy API keys, without their secrets, so they can be found and deleted. Legacy API keys grant no access. The response carries `Deprecation` and `Sunset` headers; the route is removed after the sunset date.
 *       Only users who are an `owners` or `maintainers` member of the repository or organization may list API keys.
 *       Users with the `admin` flag may list API keys for any repository.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account
 *       - in: path
 *         name: repository_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the repository to list API keys for
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
 *         description: Not Found - Repository not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string; repository_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id, repository_id } = await params;
    const repository = await productsTable.fetchById(account_id, repository_id);
    if (!repository) {
      return NextResponse.json(
        {
          error: `Repository with ID ${account_id}/${repository_id} not found`,
        },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, repository, Actions.ListRepositoryAPIKeys)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const apiKeys = await apiKeysTable.listByAccount(
      repository.account_id,
      repository.product_id
    );
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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
