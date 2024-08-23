import type { NextApiRequest, NextApiResponse } from "next";
import { get_account } from "@/lib/api/utils";
import { ErrorResponse, Account } from "@/lib/api/types";
import logger from "@/utils/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account | ErrorResponse>
) {
  try {
    const { account_id } = req.query;

    const account = await get_account(account_id as string);

    if (!account) {
      return res
        .status(404)
        .json({ code: 404, message: `Account ${account_id} not found` });
    } else {
      return res.status(200).json(account);
    }
  } catch (e) {
    logger.error(e);
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}
