import type { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandling } from "@/api/middleware";
import { Actions, RepositoryList } from "@/types";
import { MethodNotImplementedError } from "@/lib/api/errors";
import { getServerSession } from "@ory/nextjs/app";
import { getFeaturedRepositories } from "@/api/db";
import { isAuthorized } from "@/lib/api/authz";
import { StatusCodes } from "http-status-codes";

async function featuredRepositoriesHandler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryList>
): Promise<void> {
  const session = await getApiSession(request);

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
