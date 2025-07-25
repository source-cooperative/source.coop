import { NextRequest, NextResponse } from "next/server";
import { Actions, RepositoryUpdateRequestSchema } from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import { StatusCodes } from "http-status-codes";
import { getApiSession } from "@/lib/api/utils";
import { productsTable } from "@/lib/clients/database/products";

/**
 * @openapi
 * /repositories/{account_id}/{repository_id}:
 *   get:
 *     tags: [Repositories]
 *     summary: Get an existing repository
 *     description: |
 *       Retrieves an existing repository for the specified account.
 *       For user accounts, you must be authenticated as the user account you are retrieving the repository for.
 *       For organization accounts, you must be authenticated as either an `owners` or `maintainers` member for the organization you are retrieving the repository from.
 *
 *       Users with the `admin` flag may retrieve repositories for any account.
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
 *         description: The ID of the repository to retrieve
 *     responses:
 *       '200':
 *         description: Successfully retrieved repository
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Repository'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(
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
    if (!isAuthorized(session, repository, Actions.GetRepository)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    return NextResponse.json(repository, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /repositories/{account_id}/{repository_id}:
 *   put:
 *     tags: [Repositories]
 *     summary: Update an existing repository
 *     description: |
 *       Updates an existing repository for the specified account.
 *       For user accounts, you must be authenticated as the user account you are updating the repository for.
 *       For organization accounts, you must be authenticated as either an `owners` or `maintainers` member for the organization you are updating the repository for.
 *
 *       Users with the `admin` flag may update repositories for any account.
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
 *         description: The ID of the repository to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RepositoryUpdateRequest'
 *     responses:
 *       '200':
 *         description: Successfully updated repository
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Repository'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
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
    const repositoryUpdate = RepositoryUpdateRequestSchema.parse(
      await request.json()
    );
    if (!isAuthorized(session, repository, Actions.PutRepository)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    // repository.meta = repositoryUpdate.meta; // TODO: Fix this
    // repository.state = repositoryUpdate.state; // TODO: Fix this
    await productsTable.update(repository);
    return NextResponse.json(repository, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /repositories/{account_id}/{repository_id}:
 *   delete:
 *     tags: [Repositories]
 *     summary: Disable an existing repository
 *     description: |
 *       Disables an existing repository for the specified account.
 *       For user accounts, you must be authenticated as the user account you are disabling the repository for.
 *       For organization accounts, you must be authenticated as either an `owners` or `maintainers` member for the organization you are disabling the repository for.
 *
 *       Users with the `admin` flag may disable repositories for any account.
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
 *         description: The ID of the repository to disable
 *     responses:
 *       '200':
 *         description: Successfully disabled repository
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Repository'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function DELETE(
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
    if (!isAuthorized(session, repository, Actions.DisableRepository)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    // repository.disabled = true; // TODO: Does disabled need to be supported?
    await productsTable.update(repository);
    return NextResponse.json(repository, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
