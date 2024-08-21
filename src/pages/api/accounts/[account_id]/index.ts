import type { NextApiRequest, NextApiResponse } from "next";
import { checkSession, get_account } from "@/lib/api/utils";
import {
  OrganizationAccount,
  UserAccount,
  ErrorResponse,
} from "@/lib/api/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserAccount | OrganizationAccount | ErrorResponse>
) {
  const { account_id } = req.query;

  const account = await get_account(account_id as string);

  if (!account) {
    return res
      .status(404)
      .json({ code: 404, message: `Account ${account_id} not found` });
  } else {
    return res.status(200).json(account);
  }
}