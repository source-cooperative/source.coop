import type { NextApiRequest, NextApiResponse } from "next";
import { get_repositories, get_session } from "@/lib/api/utils";
import { Actions, Repository } from "@/lib/api/types";
import { isAuthorized } from "@/lib/api/authz";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Repository[]>
) {
  const session = await get_session(req);
  var repositories = await get_repositories();
  repositories = repositories.filter((repository) =>
    isAuthorized(session, repository, Actions.LIST_REPOSITORY)
  );

  res
    .status(200)
    .json(
      repositories.filter((repository: Repository) => repository.featured === 1)
    );
}
