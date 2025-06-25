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
import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { getApiSession } from "@/lib/api/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
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
