/**
 * @openapi
 * /products/{account_id}/{repository_id}/api-keys:
 *   post:
 *     tags: [API Keys, Products]
 *     summary: Create a new API key
 *     description: Creates a new API key for the specified repository.
 *       Only users who are an `owners` or `maintainers` member of the repository or organization may create an API Key.
 *       Users with the `admin` flag may create API keys for any repository.
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
 *         description: The ID of the repository to create the API key for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/APIKeyRequest'
 *     responses:
 *       200:
 *         description: Successfully created API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/APIKey'
 *       400:
 *         description: Bad request - Invalid request body or expiration date
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Repository not found
 *       500:
 *         description: Internal server error
 */
import { NextRequest, NextResponse } from "next/server";
import {
  Actions,
  APIKey,
  APIKeyRequest,
  APIKeyRequestSchema,
  RedactedAPIKey,
  RedactedAPIKeySchema,
} from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import {
  generateAccessKeyID,
  generateSecretAccessKey,
} from "@/lib/actions/crypto";
import { LOGGER } from "@/lib";
import { productsTable } from "@/lib/clients/database/products";
import { apiKeysTable } from "@/lib/clients/database/api-keys";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string; repository_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id, repository_id } = await params;
    const apiKeyRequest: APIKeyRequest = APIKeyRequestSchema.parse(
      await request.json()
    );
    if (Date.parse(apiKeyRequest.expires) <= Date.now()) {
      return NextResponse.json(
        { error: "API key expiration date must be in the future" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    const repository = await productsTable.fetchById(account_id, repository_id);
    if (!repository) {
      return NextResponse.json(
        {
          error: `Repository with ID ${account_id}/${repository_id} not found`,
        },
        { status: StatusCodes.NOT_FOUND }
      );
    }

    for (let i = 0; i < 3; i++) {
      try {
        const apiKey: APIKey = {
          ...apiKeyRequest,
          disabled: false,
          account_id: repository.account_id,
          repository_id: repository.product_id,
          access_key_id: generateAccessKeyID(),
          secret_access_key: generateSecretAccessKey(),
        };

        if (!isAuthorized(session, apiKey, Actions.CreateAPIKey)) {
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: StatusCodes.UNAUTHORIZED }
          );
        }

        const createdAPIKey = await apiKeysTable.create(apiKey);
        return NextResponse.json(createdAPIKey, { status: StatusCodes.OK });
      } catch (e) {
        LOGGER.error("Error creating API key", {
          operation: "products.api-keys.POST",
          context: "API key creation",
          error: e,
        });
      }
    }
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /products/{account_id}/{repository_id}/api-keys:
 *   get:
 *     tags: [API Keys, Products]
 *     summary: List API keys for a repository
 *     description: Retrieves all API keys associated with the specified repository.
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
    return NextResponse.json(redactedAPIKeys, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
