import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { UserSession } from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import { MethodNotImplementedError, UnauthorizedError } from "@/api/errors";

async function whoamiHandler(
  req: NextApiRequest,
  res: NextApiResponse<UserSession>
) {
  const session = await getSession(req);
  if (!session) {
    throw new UnauthorizedError();
  }

  return res.status(StatusCodes.OK).json(session);
}

async function handler(req: NextApiRequest, res: NextApiResponse<UserSession>) {
  if (req.method === "GET") {
    return whoamiHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
