import type { NextApiRequest, NextApiResponse } from "next";
import { get_account } from "@/lib/api/utils";
import { ErrorResponse, Account, AccountType } from "@/lib/api/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account | ErrorResponse>
) {
  const { account_id } = req.query;

  const account = await get_account(account_id as string);

  if (!account) {
    return res
      .status(404)
      .json({ code: 404, message: `Account ${account_id} not found` });
  }

  if (account.account_type !== AccountType.ORGANIZATION) {
    return res
      .status(400)
      .json({
        code: 400,
        message: `Account ${account_id} is not an organization`,
      });
  }
}
