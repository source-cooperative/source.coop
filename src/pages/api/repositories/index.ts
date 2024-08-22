import type { NextApiRequest, NextApiResponse } from "next";
import { get_repositories, get_session } from "@/lib/api/utils";
import { Repository, RepositoryListResponse, Actions } from "@/lib/api/types";
import { convertToNumber } from "@/lib/utils";
import { isAuthorized } from "@/lib/api/authz";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryListResponse>
) {
  const { next, limit, tags, q } = req.query;
  const session = await get_session(req);

  const page = next ? convertToNumber(next) : 1;
  const returnLimit = limit ? convertToNumber(limit) : 10;
  const startIndex = (page - 1) * returnLimit;

  var repositories = await get_repositories();

  repositories = repositories.filter((repository) =>
    isAuthorized(session, repository, Actions.LIST_REPOSITORY)
  );

  // Filter out repositories which don't include the specified tags if that parameter is specified
  if (tags) {
    repositories = repositories.filter((repository: Repository) =>
      repository.meta.tags.some((tag) => tags.includes(tag))
    );
  }

  // Filter out repositories which don't include the search term if that parameter is specified
  if (q) {
    const searchTerm = Array.isArray(q) ? q[0] : q;

    repositories = repositories.filter(
      (repository: Repository) =>
        repository.meta.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        repository.meta.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
  }

  res.status(200).json({
    repositories: repositories.slice(startIndex, startIndex + returnLimit),
    count: repositories.slice(startIndex, startIndex + returnLimit).length,
    next:
      page * returnLimit < repositories.length
        ? (next ? convertToNumber(next) + 1 : 2).toString()
        : null,
  });
}
