import { NextRequest, NextResponse } from "next/server";
import { Actions } from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import { StatusCodes } from "http-status-codes";
import { getApiSession } from "@/lib/api/utils";
import { productsTable } from "@/lib/clients/database/products";

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
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const featuredRepositories = await productsTable.listFeatured();
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
