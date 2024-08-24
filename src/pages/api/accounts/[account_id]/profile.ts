import type { NextApiRequest, NextApiResponse } from "next";
import { getSession, getProfileImage } from "@/api/utils";
import {
  Actions,
  AccountProfileSchema,
  AccountProfileResponse,
} from "@/api/types";
import { isAuthorized } from "@/api/authz";
import { getAccount, putAccount } from "@/api/db";
import { withErrorHandling } from "@/api/middleware.ts";
import {
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import { StatusCodes } from "http-status-codes";

async function getProfile(
  req: NextApiRequest,
  res: NextApiResponse<AccountProfileResponse>
) {
  const { account_id } = req.query;
  const session = await getSession(req);
  const account = await getAccount(account_id as string);

  // If the account does not exist, return a 404 error
  if (!account) {
    throw new NotFoundError(`Account ${account_id} not found`);
  }

  // If the user does not have permission to view the account profile, return a 401 error
  if (!isAuthorized(session, account, Actions.GetAccountProfile)) {
    throw new UnauthorizedError();
  }

  return res.status(StatusCodes.OK).json({
    ...account.profile,
    profile_image: getProfileImage(account.email),
  });
}

async function updateProfile(
  req: NextApiRequest,
  res: NextApiResponse<AccountProfileResponse>
) {
  const { account_id } = req.query;
  const session = await getSession(req);
  var account = await getAccount(account_id as string);

  // If the account does not exist, return a 404 error
  if (!account) {
    throw new NotFoundError(`Account ${account_id} not found`);
  }

  // If the user does not have permission to view the account profile, return a 401 error
  if (!isAuthorized(session, account, Actions.PutAccountProfile)) {
    throw new UnauthorizedError();
  }

  // Parse the request body
  const profile = AccountProfileSchema.parse(req.body);

  account.profile = profile;
  putAccount(account);

  return res.status(StatusCodes.OK).json({
    ...account.profile,
    profile_image: getProfileImage(account.email),
  });
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AccountProfileResponse>
) {
  if (req.method === "GET") {
    return getProfile(req, res);
  }

  if (req.method === "PUT") {
    return updateProfile(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
