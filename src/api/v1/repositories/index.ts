import type { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandling } from "@/api/middleware";
import { Actions, RepositoryListResponse, AccountFlags } from "@/api/types";
import { MethodNotImplementedError } from "@/api/errors";
import { StatusCodes } from "http-status-codes";
import { getRepositories } from "@/api/db";
import { getSession } from "@/api/utils";
import { isAuthorized } from "@/api/authz";

export async function getRepositoriesHandler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryListResponse>
) {
  const session = await getSession(req);
  const repositoryResponse: RepositoryListResponse = {
    repositories: [],
    next: undefined,
    count: 0,
  };

  const { tags, search } = req.query;
  const next = Number(req.query.next) || 1;
  const limit = Number(req.query.limit) || 10;
  const tagsArray =
    typeof tags === "string"
      ? tags.split(",").map((tag) => tag.trim().toLowerCase())
      : [];

  var filteredRepositories = [];
  const allRepositories = await getRepositories();

  for (const repository of allRepositories) {
    var match = false;
    if (tagsArray.length === 0 && !search) {
      match = true;
    } else {
      if (search) {
        if (
          repository.meta.title
            .toLowerCase()
            .includes((search as string).toLowerCase())
        ) {
          match = true;
        }

        if (
          repository.meta.description
            .toLowerCase()
            .includes((search as string).toLowerCase())
        ) {
          match = true;
        }

        if (
          repository.account_id
            .toLowerCase()
            .includes((search as string).toLowerCase())
        ) {
          match = true;
        }

        if (
          repository.repository_id
            .toLowerCase()
            .includes((search as string).toLowerCase())
        ) {
          match = true;
        }
      }

      for (const tag of tagsArray) {
        if (repository.meta.tags.includes(tag)) {
          match = true;
        }
      }
    }

    if (
      repository.disabled &&
      !session?.account?.flags?.includes(AccountFlags.ADMIN)
    ) {
      continue;
    }

    if (match && isAuthorized(session, repository, Actions.ListRepository)) {
      filteredRepositories.push(repository);
    }
  }

  filteredRepositories.sort((a, b) => {
    const dateA = new Date(a.published);
    const dateB = new Date(b.published);
    return dateB.getTime() - dateA.getTime();
  });

  const startIndex = (next - 1) * limit;
  const endIndex = startIndex + limit;
  repositoryResponse.repositories = filteredRepositories.slice(
    startIndex,
    endIndex
  );
  repositoryResponse.count = filteredRepositories.length;
  repositoryResponse.next =
    filteredRepositories.length > endIndex ? String(next + 1) : undefined;

  res.status(StatusCodes.OK).json(repositoryResponse);
}

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryListResponse>
) {
  if (req.method === "GET") {
    return getRepositoriesHandler(req, res);
  }

  // If the method is neither POST nor GET, throw an error
  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
