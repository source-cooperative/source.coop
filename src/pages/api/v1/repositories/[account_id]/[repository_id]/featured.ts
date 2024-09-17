import type { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandling } from "@/api/middleware";
import {
  Actions,
  Repository,
  RepositoryFeaturedUpdateRequestSchema,
  RepositoryUpdateRequestSchema,
} from "@/api/types";
import { getSession, isAdmin } from "@/api/utils";
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
 *   put:
 *     tags: [Repositories]
 *     summary: Updates a repositories featured state
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RepositoryFeaturedUpdateRequest'
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
async function putRepositoryFeaturedHandler(
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

  if (!isAdmin(session)) {
    throw new UnauthorizedError();
  }

  const repositoryUpdate = RepositoryFeaturedUpdateRequestSchema.parse(
    req.body
  );

  repository.featured = repositoryUpdate.featured;

  await putRepository(repository);

  res.status(StatusCodes.OK).json(repository);
}

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Repository>
) {
  if (req.method === "PUT") {
    return putRepositoryFeaturedHandler(req, res);
  }

  // If the method is neither POST nor GET, throw an error
  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
