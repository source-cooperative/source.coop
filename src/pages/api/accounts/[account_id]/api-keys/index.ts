import type { NextApiRequest, NextApiResponse } from "next";
import {
  get_api_keys,
  get_session,
  get_account,
  parse_request_body,
  put_api_key,
} from "@/lib/api/utils";
import {
  ErrorResponse,
  APIKey,
  APIKeySchema,
  APIKeyRequestSchema,
} from "@/lib/api/types";
import { isAuthorized } from "@/lib/api/authz";

import crypto from "crypto";

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

async function getAPIKeys(
  req: NextApiRequest,
  res: NextApiResponse<APIKey[] | ErrorResponse>
) {
  const { account_id } = req.query;
  const session = await get_session(req);

  const account = await get_account(account_id as string);
  if (!account) {
    return res
      .status(404)
      .json({ code: 404, message: `Account ${account_id} not found` });
  }

  // TODO: Check authorization

  try {
    var api_keys = await get_api_keys(account_id as string);
    api_keys = api_keys.map((api_key) => ({
      ...api_key,
      secret_access_key: api_key.hasOwnProperty("secret_access_key")
        ? null
        : undefined,
    }));
    return res.status(200).json(api_keys);
  } catch (e) {
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}

async function createAPIKey(
  req: NextApiRequest,
  res: NextApiResponse<APIKey | ErrorResponse>
) {
  const { account_id } = req.query;
  const session = await get_session(req);

  try {
    const account = await get_account(account_id as string);
    if (!account) {
      return res
        .status(404)
        .json({ code: 404, message: `Account ${account_id} not found` });
    }
  } catch (e) {
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }

  // TODO: Check authorization

  // Parse the request body
  const { result: api_key_request, error } = parse_request_body(
    req,
    APIKeyRequestSchema
  );

  // If the request body is invalid, return the parse error
  if (error) {
    return res.status(error.status).json(error);
  }

  // TODO: Check the expires time to ensure it's in the future

  const api_key: APIKey = {
    ...api_key_request,
    access_key_id: generateAccessKeyId(),
    secret_access_key: generateSecretAccessKey(),
    disabled: false,
    account_id: account_id as string,
  };

  try {
    put_api_key(api_key);
    return res.status(201).json(api_key);
  } catch (e) {
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIKey[] | APIKey | ErrorResponse>
) {
  if (req.method === "POST") {
    return await createAPIKey(req, res);
  } else if (req.method === "GET") {
    return await getAPIKeys(req, res);
  }

  return res.status(405).json({ code: 405, message: "Method Not Allowed" });
}
