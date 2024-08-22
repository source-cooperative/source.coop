import type { NextApiRequest, NextApiResponse } from "next";
import { get_repository, get_session } from "@/lib/api/utils";
import { Repository, ErrorResponse, Actions } from "@/lib/api/types";
import { isAuthorized } from "@/lib/api/authz";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Repository | ErrorResponse>
) {
  const { account_id, repository_id } = req.query;
  const session = await get_session(req);

  const repository = await get_repository(
    account_id as string,
    repository_id as string
  );

  if (
    !repository ||
    !isAuthorized(session, repository, Actions.GET_REPOSITORY)
  ) {
    return res.status(404).json({
      code: 404,
      message: `Repository ${account_id}/${repository_id} not found`,
    });
  }

  return res.status(200).json(repository);
}
