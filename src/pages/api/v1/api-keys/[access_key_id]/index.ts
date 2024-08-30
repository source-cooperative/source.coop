// Import necessary modules and types
import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { Actions, RedactedAPIKey, RedactedAPIKeySchema } from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import { MethodNotImplementedError, UnauthorizedError } from "@/api/errors";
import { putAPIKey, getAPIKey } from "@/api/db";
import { isAuthorized } from "@/api/authz";

/**
 * @openapi
 * /api-keys/{access_key_id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Revoke an API key
 *     description: Revokes (disables) the specified API key.
 *       For an API Key assigned to a User account, only the user who created the API key can revoke it.
 *       For an API Key assigned to an Organization, only organization members with `owners` or `maintainers` membership can revoke it.
 *       For an API Key assigned to a Repoisitory, only repository or organization members with `owners` or `maintainers` membership can revoke it.
 *       Users with the `admin` flag may disable any API Key.
 *     parameters:
 *       - in: path
 *         name: access_key_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The access key ID of the API key to revoke
 *     responses:
 *       200:
 *         description: Successfully revoked API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RedactedAPIKey'
 *       401:
 *         description: Unauthorized - No valid session found, insufficient permissions, or API key not found
 *       500:
 *         description: Internal server error
 */
async function revokeAPIKeyHandler(
  req: NextApiRequest,
  res: NextApiResponse<RedactedAPIKey>
): Promise<void> {
  // Get the current session
  const session = await getSession(req);
  const { access_key_id } = req.query;

  // Fetch the API key
  const apiKey = await getAPIKey(access_key_id as string);

  if (!apiKey) {
    throw new UnauthorizedError();
  }

  if (!isAuthorized(session, apiKey, Actions.RevokeAPIKey)) {
    throw new UnauthorizedError();
  }

  apiKey.disabled = true;

  const [revokedAPIKey] = await putAPIKey(apiKey);

  // Send the revoked API key as the response
  res.status(StatusCodes.OK).json(RedactedAPIKeySchema.parse(revokedAPIKey));
}

// Handler function for the API route
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RedactedAPIKey>
) {
  // Check if the request method is DELETE
  if (req.method === "DELETE") {
    return revokeAPIKeyHandler(req, res);
  }

  // If the method is not DELETE, throw an error
  throw new MethodNotImplementedError();
}

// Export the handler with error handling middleware
export default withErrorHandling(handler);
