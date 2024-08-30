// Import necessary modules and types
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import {
  Actions,
  APIKey,
  APIKeyRequest,
  APIKeyRequestSchema,
  RedactedAPIKey,
  RedactedAPIKeySchema,
} from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import { putAPIKey, getRepository, getAPIKeys } from "@/api/db";
import { isAuthorized } from "@/api/authz";
import { generateAccessKeyID, generateSecretAccessKey } from "@/api/utils";

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
async function createAPIKeyHandler(
  req: NextApiRequest,
  res: NextApiResponse<APIKey>
): Promise<void> {
  // Get the current session
  const session = await getSession(req);
  const { account_id, repository_id } = req.query;

  // Parse and validate the API key request
  const apiKeyRequest: APIKeyRequest = APIKeyRequestSchema.parse(req.body);

  // Check if the expiration date is in the future
  if (Date.parse(apiKeyRequest.expires) <= Date.now()) {
    throw new BadRequestError("API key expiration date must be in the future");
  }

  // Fetch the repository
  const repository = await getRepository(
    account_id as string,
    repository_id as string
  );

  if (!repository) {
    throw new NotFoundError(
      `Repository with ID ${account_id}/${repository_id} not found`
    );
  }

  let [apiKeyCreated, success]: [APIKey | null, boolean] = [null, false];
  do {
    // Create the API key object
    let apiKey: APIKey = {
      ...apiKeyRequest,
      disabled: false,
      account_id: repository.account_id,
      repository_id: repository.repository_id,
      access_key_id: generateAccessKeyID(),
      secret_access_key: generateSecretAccessKey(),
    };

    // Check if the user is authorized to create an API key
    if (!isAuthorized(session, apiKey, Actions.CreateAPIKey)) {
      throw new UnauthorizedError();
    }

    // Attempt to put the API key in the database
    [apiKeyCreated, success] = await putAPIKey(apiKey, true);

    if (success) {
      // Send the created API key as the response
      res.status(StatusCodes.OK).json(apiKeyCreated);
    }
  } while (!success);
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
async function getAPIKeysHandler(
  req: NextApiRequest,
  res: NextApiResponse<RedactedAPIKey[]>
): Promise<void> {
  // Get the current session
  const session = await getSession(req);
  const { account_id, repository_id } = req.query;

  // Fetch the repository
  const repository = await getRepository(
    account_id as string,
    repository_id as string
  );

  if (!repository) {
    throw new NotFoundError(
      `Repository with ID ${account_id}/${repository_id} not found`
    );
  }

  // Check if the user is authorized to list API keys for this repository
  if (!isAuthorized(session, repository, Actions.ListRepositoryAPIKeys)) {
    throw new UnauthorizedError();
  }

  // Retrieve API keys for the repository
  const apiKeys = await getAPIKeys(
    repository.account_id,
    repository.repository_id
  );
  const redactedAPIKeys: RedactedAPIKey[] = [];
  for (const apiKey of apiKeys) {
    // Check if the user is authorized to view the API Key
    if (isAuthorized(session, apiKey, Actions.GetAPIKey)) {
      redactedAPIKeys.push(RedactedAPIKeySchema.parse(apiKey));
    }
  }

  // Send the list of redacted API keys as the response
  res.status(StatusCodes.OK).json(redactedAPIKeys);
}

// Handler function for the API route
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIKey | RedactedAPIKey[]>
) {
  // Check if the request method is POST
  if (req.method === "POST") {
    return createAPIKeyHandler(req, res);
  } else if (req.method === "GET") {
    return getAPIKeysHandler(req, res);
  }

  // If the method is not POST, throw an error
  throw new MethodNotImplementedError();
}

// Export the handler with error handling middleware
export default withErrorHandling(handler);
