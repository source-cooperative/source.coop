/**
 * @openapi
 * /repositories/{account_id}/{repository_id}/api-keys:
 *   post:
 *     tags: [API Keys, Repositories]
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
import { NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import {
  Actions,
  APIKey,
  APIKeyRequest,
  APIKeyRequestSchema,
  RedactedAPIKey,
  RedactedAPIKeySchema,
} from "@/api/types";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import { putAPIKey, getRepository, getAPIKeys } from "@/api/db";
import { isAuthorized } from "@/api/authz";
import { generateAccessKeyID, generateSecretAccessKey } from "@/api/utils";

export async function POST(
  request: Request,
  { params }: { params: { account_id: string; repository_id: string } }
) {
  try {
    const session = await getServerSession();
    const { account_id, repository_id } = params;
    const apiKeyRequest: APIKeyRequest = APIKeyRequestSchema.parse(
      await request.json()
    );
    if (Date.parse(apiKeyRequest.expires) <= Date.now()) {
      return NextResponse.json(
        { error: "API key expiration date must be in the future" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    const repository = await getRepository(account_id, repository_id);
    if (!repository) {
      return NextResponse.json(
        {
          error: `Repository with ID ${account_id}/${repository_id} not found`,
        },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    let [apiKeyCreated, success]: [APIKey | null, boolean] = [null, false];
    do {
      let apiKey: APIKey = {
        ...apiKeyRequest,
        disabled: false,
        account_id: repository.account_id,
        repository_id: repository.repository_id,
        access_key_id: generateAccessKeyID(),
        secret_access_key: generateSecretAccessKey(),
      };
      if (!isAuthorized(session, apiKey, Actions.CreateAPIKey)) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: StatusCodes.UNAUTHORIZED }
        );
      }
      [apiKeyCreated, success] = await putAPIKey(apiKey, true);
      if (success) {
        return NextResponse.json(apiKeyCreated, { status: StatusCodes.OK });
      }
    } while (!success);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /repositories/{account_id}/{repository_id}/api-keys:
 *   get:
 *     tags: [API Keys, Repositories]
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
  request: Request,
  { params }: { params: { account_id: string; repository_id: string } }
) {
  try {
    const session = await getServerSession();
    const { account_id, repository_id } = params;
    const repository = await getRepository(account_id, repository_id);
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
    const apiKeys = await getAPIKeys(
      repository.account_id,
      repository.repository_id
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
