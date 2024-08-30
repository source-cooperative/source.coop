import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { UserSession } from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import { MethodNotImplementedError, UnauthorizedError } from "@/api/errors";

async function whoamiHandler(
  req: NextApiRequest,
  res: NextApiResponse<UserSession>
): Promise<void> {
  const session = await getSession(req);
  if (!session) {
    throw new UnauthorizedError();
  }

  res.status(StatusCodes.OK).json(session);
}

/**
 * @openapi
 * /whoami:
 *   get:
 *     tags: [Authentication]
 *     description: Get the current user's session information.
 *       If the user is authenticated but has not created an account, the account field will be null.
 *       If the user is not authenticated, a `401 - Unauthorized` response will be returned.
 *       This endpoint can be used to list all of the authenticated user's memberships.
 *     responses:
 *       200:
 *         description: Returns the user session data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserSession'
 *       401:
 *         description: Unauthorized - No valid session found
 */
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserSession>
) {
  if (req.method === "GET") {
    return whoamiHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
