import { NextRequest, NextResponse } from "next/server";
import {
  Actions,
  RepositoryPermissions,
  RepositoryPermissionsResponse,
} from "@/types";
import { getApiSession } from "@/lib/api/utils";
import { productsTable } from "@/lib/clients/database/products";
import { isAuthorized } from "@/lib/api/authz";
import { StatusCodes } from "http-status-codes";
import { LOGGER } from "@/lib";

/**
 * @openapi
 * /products/{account_id}/{repository_id}/permissions:
 *   get:
 *     tags: [Products]
 *     summary: Get repository permissions
 *     description: Retrieves the current user's permissions for a specific repository.
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
 *         description: The ID of the repository to get permissions for
 *     responses:
 *       200:
 *         description: Successfully retrieved repository permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RepositoryPermissions'
 *       401:
 *         description: Unauthorized - No valid session found
 *       404:
 *         description: Not Found - Repository not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string; repository_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id, repository_id } = await params;

    const product = await productsTable.fetchById(account_id, repository_id);

    if (!product) {
      return NextResponse.json(
        {
          error: `Repository with ID ${account_id}/${repository_id} not found`,
        },
        { status: StatusCodes.NOT_FOUND }
      );
    }

    const permissions: RepositoryPermissionsResponse = [];

    if (isAuthorized(session, product, Actions.WriteRepositoryData)) {
      permissions.push(RepositoryPermissions.Write);
    }

    LOGGER.debug("Session and product for permissions check", {
      operation: "products.permissions.GET",
      context: "permissions check",
      metadata: {
        account_id,
        repository_id,
        hasSession: !!session,
        hasProduct: !!product,
      },
    });
    if (isAuthorized(session, product, Actions.ReadRepositoryData)) {
      permissions.push(RepositoryPermissions.Read);
    }

    return NextResponse.json(permissions, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
