import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api/utils";
import { isAdmin } from "@/lib/api/authz";
import { productsTable } from "@/lib/clients/database/products";
import { StatusCodes } from "http-status-codes";

/**
 * @openapi
 * /repositories/{account_id}/{repository_id}/featured:
 *   put:
 *     tags: [Repositories]
 *     summary: Updates a repositories featured state
 *     description: |
 *       Updates the featured state of a repository. This functionality is not yet implemented
 *       in the new product schema and will return a 501 Not Implemented error.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account that owns the repository
 *       - in: path
 *         name: repository_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the repository to update featured state
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RepositoryFeaturedUpdateRequest'
 *     responses:
 *       '501':
 *         description: Not Implemented - Featured functionality not available in new schema
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string; repository_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id, repository_id } = await params;

    const repository = await productsTable.fetchById(account_id, repository_id);

    if (!repository) {
      return NextResponse.json(
        {
          error: `Repository with ID ${account_id}/${repository_id} not found`,
        },
        { status: StatusCodes.NOT_FOUND }
      );
    }

    if (!isAdmin(session)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }

    // Featured functionality is not implemented in the new Product_v2 schema
    return NextResponse.json(
      {
        error:
          "Featured functionality is not yet implemented in the new product schema",
        code: "NOT_IMPLEMENTED",
      },
      { status: StatusCodes.NOT_IMPLEMENTED }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
