import type { NextApiRequest, NextApiResponse } from "next";
import { get_repositories, get_session } from "@/lib/api/utils";
import {
  Repository,
  RepositoryListResponse,
  Actions,
  ErrorResponse,
} from "@/lib/api/types";
import { convertToNumber } from "@/lib/utils";
import { isAuthorized } from "@/lib/api/authz";
import logger from "@/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RepositoryListResponse | ErrorResponse>
) {
  const { next, limit, tags, q } = req.query;
  try {
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
  } catch (e) {
    logger.error(e);
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}
