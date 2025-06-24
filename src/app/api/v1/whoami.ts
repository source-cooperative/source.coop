import type { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { UserSession } from "@/types";
import { withErrorHandling } from "@/lib/api/utils";
import { StatusCodes } from "http-status-codes";
import { MethodNotImplementedError, UnauthorizedError } from "@/lib/api/errors";
import { getApiSession } from "@/lib/api/utils";

async function whoamiHandler(
  req: NextRequest,
  res: NextResponse<UserSession>
): Promise<void> {
  const session = await getApiSession(req);
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
  req: NextRequest,
  res: NextResponse<UserSession>
) {
  if (req.method === "GET") {
    return whoamiHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
