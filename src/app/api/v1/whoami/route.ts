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
import { NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { UserSession } from "@/types";
import { StatusCodes } from "http-status-codes";
import { UnauthorizedError } from "@/lib/api/errors";

export async function GET() {
  try {
    const session = await getApiSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    return NextResponse.json(session, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
