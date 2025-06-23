import type { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandling } from "@/api/middleware";
import {
  Actions,
  Repository,
  RepositoryCreationRequestSchema,
  RepositoryFeatured,
  RepositoryList,
  RepositoryState,
} from "@/api/types";
import {
  BadRequestError,
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import { getSession } from "@/api/utils";
import {
  getAccount,
  getDataConnection,
  getRepositoriesByAccount,
  putRepository,
} from "@/api/db";
import { isAuthorized } from "@/api/authz";
import Handlebars from "handlebars";
import { StatusCodes } from "http-status-codes";

async function listRepositoriesHandler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryList>
): Promise<void> {
  const session = await getSession(req);

  const { account_id } = req.query;

  const account = await getAccount(account_id as string);

  if (!account) {
    throw new NotFoundError(`Account with ID ${account_id} not found`);
  }

  const repositories: Repository[] = await getRepositoriesByAccount(
    account_id as string
  );

  const filteredRepositories = repositories.filter((repository) => {
    return isAuthorized(session, repository, Actions.ListRepository);
  });

  const response: RepositoryList = {
    repositories: filteredRepositories,
  };

  res.status(StatusCodes.OK).json(response);
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
async function createRepositoryHandler(
  req: NextApiRequest,
  res: NextApiResponse<Repository>
): Promise<void> {
  const session = await getSession(req);
  const { account_id } = req.query;

  const repositoryCreateRequest = RepositoryCreationRequestSchema.parse(
    req.body
  );

  const account = await getAccount(account_id as string);

  if (!account) {
    throw new NotFoundError(`Account with ID ${account_id} not found`);
  }

  const dataConnection = await getDataConnection(
    repositoryCreateRequest.data_connection_id
  );

  if (!dataConnection) {
    throw new BadRequestError(
      `Data connection with ID ${repositoryCreateRequest.data_connection_id} not found`
    );
  }

  if (dataConnection.read_only) {
    throw new BadRequestError(`Data connection is in read-only mode`);
  }

  if (
    !dataConnection.allowed_data_modes.includes(
      repositoryCreateRequest.data_mode
    )
  ) {
    throw new BadRequestError(
      `Data connection does not support data mode ${repositoryCreateRequest.data_mode}`
    );
  }

  if (
    dataConnection.required_flag &&
    !account.flags?.includes(dataConnection.required_flag)
  ) {
    throw new BadRequestError(
      `Account does not have required flag ${dataConnection.required_flag} for the data connection`
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
    throw new UnauthorizedError();
  }

  const [repository, success] = await putRepository(newRepository, true);

  if (!success) {
    throw new BadRequestError(
      `Repository with ID ${newRepository.repository_id} already exists`
    );
  }

  res.status(StatusCodes.OK).json(repository);
}

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Repository | RepositoryList>
) {
  // Check if the request method is POST or GET
  if (req.method === "POST") {
    return createRepositoryHandler(req, res);
  } else if (req.method === "GET") {
    return listRepositoriesHandler(req, res);
  }

  // If the method is neither POST nor GET, throw an error
  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
