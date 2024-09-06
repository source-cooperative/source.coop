import type { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandling } from "@/api/middleware";
import {
  Actions,
  Repository,
  RepositoryUpdateRequestSchema,
} from "@/api/types";
import { getSession } from "@/api/utils";
import { getRepository, putRepository } from "@/api/db";
import {
  NotFoundError,
  MethodNotImplementedError,
  UnauthorizedError,
} from "@/api/errors";
import { isAuthorized } from "@/api/authz";
import { StatusCodes } from "http-status-codes";

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
async function disableRepositoryHandler(
  req: NextApiRequest,
  res: NextApiResponse<Repository>
): Promise<void> {
  const session = await getSession(req);
  const { account_id, repository_id } = req.query;

  const repository = await getRepository(
    account_id as string,
    repository_id as string
  );

  if (!repository) {
    throw new NotFoundError(
      `Repository with ID ${account_id}/${repository_id} not found`
    );
  }

  if (!isAuthorized(session, repository, Actions.DisableRepository)) {
    throw new UnauthorizedError();
  }

  repository.disabled = true;

  await putRepository(repository);

  res.status(StatusCodes.OK).json(repository);
}

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
async function getRepositoryHandler(
  req: NextApiRequest,
  res: NextApiResponse<Repository>
): Promise<void> {
  const session = await getSession(req);
  const { account_id, repository_id } = req.query;

  const repository = await getRepository(
    account_id as string,
    repository_id as string
  );

  if (!repository) {
    throw new NotFoundError(
      `Repository with ID ${account_id}/${repository_id} not found`
    );
  }

  if (!isAuthorized(session, repository, Actions.GetRepository)) {
    throw new UnauthorizedError();
  }

  res.status(StatusCodes.OK).json(repository);
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
async function putRepositoryHandler(
  req: NextApiRequest,
  res: NextApiResponse<Repository>
): Promise<void> {
  const session = await getSession(req);
  const { account_id, repository_id } = req.query;

  const repository = await getRepository(
    account_id as string,
    repository_id as string
  );

  if (!repository) {
    throw new NotFoundError(
      `Repository with ID ${account_id}/${repository_id} not found`
    );
  }

  const repositoryUpdate = RepositoryUpdateRequestSchema.parse(req.body);

  if (!isAuthorized(session, repository, Actions.PutRepository)) {
    throw new UnauthorizedError();
  }

  repository.meta = repositoryUpdate.meta;
  repository.state = repositoryUpdate.state;
  await putRepository(repository);

  res.status(StatusCodes.OK).json(repository);
}

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Repository>
) {
  if (req.method === "PUT") {
    return putRepositoryHandler(req, res);
  } else if (req.method === "GET") {
    return getRepositoryHandler(req, res);
  } else if (req.method === "DELETE") {
    return disableRepositoryHandler(req, res);
  }

  // If the method is neither POST nor GET, throw an error
  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
