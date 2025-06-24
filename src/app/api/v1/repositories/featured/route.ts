import { NextResponse } from "next/server";
import { Actions, RepositoryList } from "@/types";
import { getServerSession } from "@ory/nextjs/app";
import { getFeaturedRepositories } from "@/api/db";
import { isAuthorized } from "@/lib/api/authz";
import { StatusCodes } from "http-status-codes";

/**
 * @openapi
 * /repositories/featured:
 *   get:
 *     tags: [Repositories]
 *     summary: Get featured repositories
 *     description: Retrieves a list of featured repositories that the user is authorized to view.
 *     responses:
 *       200:
 *         description: Successfully retrieved featured repositories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RepositoryList'
 *       500:
 *         description: Internal server error
 */
export async function GET() {
  try {
    const session = await getApiSession(request);
    const featuredRepositories = await getFeaturedRepositories();
    const filteredRepositories = featuredRepositories.filter((repository) => {
      return isAuthorized(session, repository, Actions.GetRepository);
    });
    return NextResponse.json(
      { repositories: filteredRepositories },
      { status: StatusCodes.OK }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
