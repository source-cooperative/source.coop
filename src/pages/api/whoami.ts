import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { ErrorResponse, UserSession } from "@/api/types";
import logger from "@/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserSession | ErrorResponse>
) {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ code: 401, message: "No Session Found" });
    }
    return res.status(200).json(session);
  } catch (e) {
    logger.error(e);
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}
