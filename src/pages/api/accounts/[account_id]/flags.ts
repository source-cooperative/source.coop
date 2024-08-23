import type { NextApiRequest, NextApiResponse } from "next";
import {
  get_account,
  get_session,
  put_account,
  parse_request_body,
} from "@/lib/api/utils";
import {
  ErrorResponse,
  AccountFlags,
  Actions,
  AccountFlagsSchema,
} from "@/lib/api/types";
import { isAuthorized } from "@/lib/api/authz";
import logger from "@/utils/logger";

async function getFlags(
  req: NextApiRequest,
  res: NextApiResponse<AccountFlags[] | ErrorResponse>
) {
  try {
    const { account_id } = req.query;
    const session = await get_session(req);
    const account = await get_account(account_id as string);

    if (!account) {
      return res
        .status(404)
        .json({ code: 404, message: `Account ${account_id} not found` });
    } else {
      if (!isAuthorized(session, account, Actions.GET_ACCOUNT_FLAGS)) {
        return res.status(401).json({ code: 401, message: "Unauthorized" });
      }

      return res.status(200).json(account.flags);
    }
  } catch (e) {
    logger.error(e);
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}

async function putFlags(
  req: NextApiRequest,
  res: NextApiResponse<AccountFlags[] | ErrorResponse>
) {
  try {
    const { account_id } = req.query;
    const session = await get_session(req);
    var account = await get_account(account_id as string);

    // If the account does not exist, return a 404 error
    if (!account) {
      return res
        .status(404)
        .json({ code: 404, message: `Account ${account_id} not found` });
    }

    // If the user does not have permission to view the account profile, return a 401 error
    if (!isAuthorized(session, account, Actions.PUT_ACCOUNT_FLAGS)) {
      return res.status(401).json({ code: 401, message: "Unauthorized" });
    }

    // Parse the request body
    const { result: flags, error } = parse_request_body(
      req,
      AccountFlagsSchema
    );

    // If the request body is invalid, return the parse error
    if (error) {
      return res.status(error.code).json(error);
    }

    account.flags = flags;
    put_account(account);

    return res.status(200).json(flags);
  } catch (e) {
    logger.error(e);
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountFlags[] | ErrorResponse>
) {
  if (req.method === "GET") {
    return await getFlags(req, res);
  } else if (req.method === "PUT") {
    return await putFlags(req, res);
  }
  return res.status(405).json({ code: 405, message: "Method Not Allowed" });
}
