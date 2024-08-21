import type { NextApiRequest, NextApiResponse } from "next";
import { get_accounts } from "@/lib/api/utils";
import { OrganizationAccount, UserAccount } from "@/lib/api/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<(UserAccount | OrganizationAccount)[]>
) {
  var accounts = await get_accounts();

  res.status(200).json(accounts);
}
