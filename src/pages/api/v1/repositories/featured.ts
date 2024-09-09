import type { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandling } from "@/api/middleware";
import { Actions, RepositoryList } from "@/api/types";
import { MethodNotImplementedError } from "@/api/errors";
import { getSession } from "@/api/utils";
import { getFeaturedRepositories } from "@/api/db";
import { isAuthorized } from "@/api/authz";
import { StatusCodes } from "http-status-codes";

async function featuredRepositoriesHandler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryList>
): Promise<void> {
  const session = await getSession(req);

  const featuredRepositories = await getFeaturedRepositories();
  const filteredRepositories = featuredRepositories.filter((repository) => {
    return isAuthorized(session, repository, Actions.GetRepository);
  });

  res.status(StatusCodes.OK).json({ repositories: filteredRepositories });
}

export async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return featuredRepositoriesHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
