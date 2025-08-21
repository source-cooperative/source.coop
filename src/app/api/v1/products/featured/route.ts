import { NextRequest, NextResponse } from "next/server";
import { Actions } from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import { StatusCodes } from "http-status-codes";
import { getApiSession } from "@/lib/api/utils";
import { productsTable } from "@/lib/clients/database/products";

/**
 * @openapi
 * /products/featured:
 *   get:
 *     tags: [Products]
 *     summary: Get featured products
 *     description: Retrieves a list of featured products that the user is authorized to view.
 *     responses:
 *       200:
 *         description: Successfully retrieved featured products
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
    const { products } = await productsTable.listPublic(10);
    const filteredProducts = products.filter((repository) =>
      isAuthorized(session, repository, Actions.GetRepository)
    );
    return NextResponse.json(
      { products: filteredProducts },
      { status: StatusCodes.OK }
    );
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
