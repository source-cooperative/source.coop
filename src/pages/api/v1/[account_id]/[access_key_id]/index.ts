import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import {
  ErrorResponse,
  APIKey,
  APIKeySchema,
  APIKeyRequestSchema,
} from "@/api/types";
import { isAuthorized } from "@/api/authz";
import { getAPIKey, getAccount, putAPIKey } from "@/api/db";
import { withErrorHandling } from "@/api/middleware";
import { MethodNotImplementedError, NotFoundError } from "@/api/errors";

import crypto from "crypto";
import { StatusCodes } from "http-status-codes";

function generateAccessKeyId(
  prefix: string = "SC",
  length: number = 16
): string {
  const characterSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  // Generate random bytes
  const randomBytes = crypto.randomBytes((length - prefix.length) * 2);

  let result = prefix;

  for (let i = 0; i < length - prefix.length; i++) {
    const randomIndex = randomBytes.readUInt16BE(i * 2) % characterSet.length;
    result += characterSet[randomIndex];
  }

  return result;
}

function generateSecretAccessKey(length: number = 48): string {
  const characterSet = "abcdefghijklmnopqrstuvwxyz0123456789";

  // Generate random bytes
  const randomBytes = crypto.randomBytes(length);

  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % characterSet.length;
    result += characterSet[randomIndex];
  }

  return result;
}

async function getAPIKeyHandler(
  req: NextApiRequest,
  res: NextApiResponse<APIKey>
) {
  const { access_key_id } = req.query;
  const session = await getSession(req);

  // TODO: Check authorization

  const api_key = await getAPIKey(access_key_id as string);

  if (!api_key) {
    throw new NotFoundError(`API Key ${access_key_id} not found`);
  }

  // TODO: Check authorization

  return res.status(StatusCodes.OK).json(api_key as APIKey);
}

async function deleteAPIKeyHandler(
  req: NextApiRequest,
  res: NextApiResponse<APIKey>
) {
  const { access_key_id } = req.query;
  const session = await getSession(req);

  var api_key = await getAPIKey(access_key_id as string);

  if (!api_key) {
    throw new NotFoundError(`API Key ${access_key_id} not found`);
  }

  // TODO: Check authorization

  api_key.disabled = true;

  putAPIKey(api_key);
  return res.status(200).json(api_key as APIKey);
}

async function handler(req: NextApiRequest, res: NextApiResponse<APIKey>) {
  if (req.method === "GET") {
    return getAPIKeyHandler(req, res);
  }

  if (req.method === "DELETE") {
    return deleteAPIKeyHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
