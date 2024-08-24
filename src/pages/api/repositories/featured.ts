import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { Actions, ErrorResponse, Repository } from "@/api/types";
import { isAuthorized } from "@/api/authz";
import { getFeaturedRepositories } from "@/api/db";
import logger from "@/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Repository[] | ErrorResponse>
) {
  try {
    const session = await getSession(req);
    var repositories = await getFeaturedRepositories();
    repositories = repositories.filter((repository) =>
      isAuthorized(session, repository, Actions.ListRepository)
    );

    res.status(200).json(repositories);
  } catch (e) {
    logger.error(e);
    return res
      .status(500)
      .json({ code: 500, message: "Internal server error" });
  }
}
