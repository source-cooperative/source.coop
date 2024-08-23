import type { NextApiRequest, NextApiResponse } from "next";
import {
  get_account,
  get_session,
  parse_request_body,
  put_account,
} from "@/lib/api/utils";
import {
  ErrorResponse,
  AccountProfile,
  Actions,
  AccountProfileSchema,
  AccountProfileResponse,
} from "@/lib/api/types";
import { isAuthorized } from "@/lib/api/authz";
import crypto from "crypto";
import logger from "@/utils/logger";

function getProfileImage(email: string): string {
  if (!email) {
    email = "default@default.com";
  }
  // Trim and lowercase the email
  const trimmedEmail = email.trim().toLowerCase();

  // Create an MD5 hash of the email
  const hash = crypto.createHash("md5").update(trimmedEmail).digest("hex");

  // Construct and return the Gravatar URL
  return `https://www.gravatar.com/avatar/${hash}`;
}

async function getProfile(
  req: NextApiRequest,
  res: NextApiResponse<AccountProfileResponse | ErrorResponse>
) {
  try {
    const { account_id } = req.query;
    const session = await get_session(req);
    const account = await get_account(account_id as string);

    // If the account does not exist, return a 404 error
    if (!account) {
      return res
        .status(404)
        .json({ code: 404, message: `Account ${account_id} not found` });
    }

    // If the user does not have permission to view the account profile, return a 401 error
    if (!isAuthorized(session, account, Actions.GET_ACCOUNT_PROFILE)) {
      return res.status(401).json({ code: 401, message: "Unauthorized" });
    }

    return res.status(200).json({
      ...account.profile,
      profile_image: getProfileImage(account.email),
    });
  } catch (e) {
    logger.error(e);
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}

async function updateProfile(
  req: NextApiRequest,
  res: NextApiResponse<AccountProfileResponse | ErrorResponse>
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
    if (!isAuthorized(session, account, Actions.GET_ACCOUNT_PROFILE)) {
      return res.status(401).json({ code: 401, message: "Unauthorized" });
    }

    // Parse the request body
    const { result: profile, error } = parse_request_body(
      req,
      AccountProfileSchema
    );

    // If the request body is invalid, return the parse error
    if (error) {
      return res.status(error.code).json(error);
    }

    account.profile = profile;
    put_account(account);

    return res.status(200).json({
      ...account.profile,
      profile_image: getProfileImage(account.email),
    });
  } catch (e) {
    logger.error(e);
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountProfileResponse | ErrorResponse>
) {
  if (req.method === "GET") {
    return getProfile(req, res);
  }

  if (req.method === "PUT") {
    return updateProfile(req, res);
  }

  return res.status(405).json({ code: 405, message: "Method Not Allowed" });
}
