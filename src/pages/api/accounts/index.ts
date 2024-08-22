import type { NextApiRequest, NextApiResponse } from "next";
import { get_accounts, get_session } from "@/lib/api/utils";
import { Actions, Account } from "@/lib/api/types";
import { isAuthorized } from "@/lib/api/authz";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account[]>
) {
  const session = await get_session(req);
  var accounts = await get_accounts();
  accounts = accounts.filter((account) =>
    isAuthorized(session, account, Actions.GET_ACCOUNT)
  );

  res.status(200).json(accounts);
}
