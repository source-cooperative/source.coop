import { NextRequest, NextResponse } from "next/server";
import {
  Actions,
  Repository,
  RepositoryCreationRequestSchema,
  RepositoryState,
  RepositoryFeatured,
} from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import Handlebars from "handlebars";
import { StatusCodes } from "http-status-codes";
import { getApiSession } from "@/lib/api/utils";
import { accountsTable } from "@/lib/clients/database/accounts";
import { productsTable } from "@/lib/clients/database/products";
import { dataConnectionsTable } from "@/lib/clients/database/data-connections";

/**
 * @openapi
 * /repositories/{account_id}:
 *   get:
 *     tags: [Repositories]
 *     summary: List repositories for an account
 *     description: Retrieves all repositories associated with the specified account that the user is authorized to view.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to list repositories for
 *     responses:
 *       200:
 *         description: Successfully retrieved repositories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RepositoryList'
 *       404:
 *         description: Not Found - Account not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { account_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = params;
    const account = await accountsTable.fetchById(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account with ID ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    let repositories = await productsTable.listByAccount(account_id);
    repositories = repositories.filter((repository) =>
      isAuthorized(session, repository, Actions.ListRepository)
    );
    return NextResponse.json({ repositories }, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /repositories/{account_id}:
 *   post:
 *     tags: [Repositories]
 *     summary: Create a new repository
 *     description: |
 *       Creates a new repository for the specified account.
 *       For user accounts, you must be authenticated as the user account you are creating the repository for.
 *       For organization accounts, you must be authenticated as either an `owners` or `maintainers` member for the organization you are creating the repository for.
 *
 *       Users with the `admin` flag may create repositories for any account.
 *     parameters:
 *       - in: path
 *         name: account_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the account to create the repository for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RepositoryCreationRequest'
 *     responses:
 *       '200':
 *         description: Successfully created repository
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
export async function POST(
  request: NextRequest,
  { params }: { params: { account_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = params;
    const repositoryCreateRequest = RepositoryCreationRequestSchema.parse(
      await request.json()
    );
    const account = await accountsTable.fetchById(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account with ID ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    const dataConnection = await dataConnectionsTable.fetchById(
      repositoryCreateRequest.data_connection_id
    );
    if (!dataConnection) {
      return NextResponse.json(
        {
          error: `Data connection with ID ${repositoryCreateRequest.data_connection_id} not found`,
        },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    if (dataConnection.read_only) {
      return NextResponse.json(
        { error: `Data connection is in read-only mode` },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    if (
      !dataConnection.allowed_data_modes.includes(
        repositoryCreateRequest.data_mode
      )
    ) {
      return NextResponse.json(
        {
          error: `Data connection does not support data mode ${repositoryCreateRequest.data_mode}`,
        },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    if (
      dataConnection.required_flag &&
      !account.flags?.includes(dataConnection.required_flag)
    ) {
      return NextResponse.json(
        {
          error: `Account does not have required flag ${dataConnection.required_flag} for the data connection`,
        },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
    let prefix: string;
    if (!dataConnection.prefix_template) {
      prefix = `${account.account_id}/${repositoryCreateRequest.repository_id}/`;
    } else {
      const ctx = {
        repository: {
          account_id: account.account_id,
          repository_id: repositoryCreateRequest.repository_id,
        },
      };
      const template = Handlebars.compile(dataConnection.prefix_template);
      prefix = template(ctx);
    }
    const newRepository: Repository = {
      ...repositoryCreateRequest,
      account_id: account.account_id,
      state: RepositoryState.Unlisted,
      featured: RepositoryFeatured.NotFeatured,
      published: new Date().toISOString(),
      disabled: false,
      data: {
        primary_mirror: repositoryCreateRequest.data_connection_id,
        mirrors: {
          [repositoryCreateRequest.data_connection_id]: {
            data_connection_id: repositoryCreateRequest.data_connection_id,
            prefix: prefix,
          },
        },
      },
    };
    if (!isAuthorized(session, newRepository, Actions.CreateRepository)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const [repository, success] = await productsTable.create(newRepository);
    if (!success) {
      return NextResponse.json(
        {
          error: `Repository with ID ${newRepository.repository_id} already exists`,
        },
        { status: StatusCodes.BAD_REQUEST }
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
