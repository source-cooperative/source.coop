import type { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandling } from "@/api/middleware";
import {
  Actions,
  RepositoryPermissions,
  RepositoryPermissionsResponse,
} from "@/api/types";
import { getSession } from "@/api/utils";
import { getRepository } from "@/api/db";
import { NotFoundError, MethodNotImplementedError } from "@/api/errors";
import { isAuthorized } from "@/api/authz";
import { StatusCodes } from "http-status-codes";

async function getRepositoryPermissionsHandler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryPermissionsResponse>
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

  var permissions: RepositoryPermissionsResponse = [];

  if (isAuthorized(session, repository, Actions.WriteRepositoryData)) {
    permissions.push(RepositoryPermissions.Write);
  }

  if (isAuthorized(session, repository, Actions.ReadRepositoryData)) {
    permissions.push(RepositoryPermissions.Read);
  }

  res.status(StatusCodes.OK).json(permissions);
}

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryPermissionsResponse>
) {
  if (req.method === "GET") {
    return getRepositoryPermissionsHandler(req, res);
  }

  // If the method is neither POST nor GET, throw an error
  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
