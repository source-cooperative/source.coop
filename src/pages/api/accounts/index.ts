import type { NextApiRequest, NextApiResponse } from "next";
import { get_session, parse_request_body, put_account } from "@/lib/api/utils";
import {
  Actions,
  Account,
  ErrorResponse,
  AccountSchema,
  AccountType,
} from "@/lib/api/types";
import { isAuthorized } from "@/lib/api/authz";
import logger from "@/utils/logger";

async function createAccount(
  req: NextApiRequest,
  res: NextApiResponse<Account | ErrorResponse>
) {
  try {
    const session = await get_session(req);

    // Parse the request body
    const { result: account, error } = parse_request_body(req, AccountSchema);

    // Return an error if the request body is invalid
    if (error) {
      return res.status(error.code).json(error);
    }

    account.disabled = false;
    account.flags = [];

    if (account.account_type === AccountType.USER) {
      account.identity_id = session.identity_id;
      const cookieHeader = req.headers.cookie;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/.ory/sessions/whoami`,
        {
          method: "GET",
          headers: {
            Cookie: cookieHeader,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
        const errorText = await response.text();
        throw new Error(
          `Error fetching session from Ory: [${response.status}] ${errorText}`
        );
      }

      const ory_session = await response.json();
      if (
        ory_session?.identity?.verifiable_addresses &&
        ory_session?.identity?.verifiable_addresses.length > 0
      ) {
        account.email = ory_session.identity.verifiable_addresses[0].value;
      }
    }

    // If the user does not have permission to create an account, return a 401 error
    if (!isAuthorized(session, account, Actions.CREATE_ACCOUNT)) {
      return res.status(401).json({ code: 401, message: "Unauthorized" });
    }

    // Create the account
    put_account(account);

    return res.status(200).json(account);
  } catch (e) {
    logger.error(e);
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account | ErrorResponse>
) {
  if (req.method === "POST") {
    return await createAccount(req, res);
  }

  return res.status(405).json({ code: 405, message: "Method Not Allowed" });
}
