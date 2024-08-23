import type { NextApiRequest, NextApiResponse } from "next";
import {
  get_api_keys,
  get_session,
  get_account,
  get_api_key,
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

async function getAPIKey(
  req: NextApiRequest,
  res: NextApiResponse<APIKey | ErrorResponse>
) {
  const { access_key_id } = req.query;
  const session = await get_session(req);

  // TODO: Check authorization

  try {
    const api_key = await get_api_key(access_key_id as string);

    // TODO: Check authorization

    return res.status(200).json(api_key);
  } catch (e) {
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}

async function deleteAPIKey(
  req: NextApiRequest,
  res: NextApiResponse<APIKey | ErrorResponse>
) {
  const { access_key_id } = req.query;
  const session = await get_session(req);

  var api_key = await get_api_key(access_key_id as string);

  // TODO: Check authorization

  api_key.disabled = true;

  try {
    put_api_key(api_key);
    return res.status(200).json(api_key);
  } catch (e) {
    return res
      .status(500)
      .json({ code: 500, message: "Internal Server Error" });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIKey | ErrorResponse>
) {
  if (req.method === "DELETE") {
    return await deleteAPIKey(req, res);
  } else if (req.method === "GET") {
    return await getAPIKey(req, res);
  }

  return res.status(405).json({ code: 405, message: "Method Not Allowed" });
}
