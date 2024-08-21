import type { NextApiRequest, NextApiResponse } from "next";
import { get_session } from "@/lib/api/utils";
import { ErrorResponse, UserSession } from "@/lib/api/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserSession | ErrorResponse>
) {
  const session = await get_session(req);

  if (!session) {
    return res.status(401).json({ code: 401, message: `No Session Found` });
  }
  return res.status(200).json(session);
}
