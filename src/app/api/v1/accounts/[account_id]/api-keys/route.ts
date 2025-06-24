import { NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import {
  Actions,
  APIKey,
  APIKeyRequest,
  APIKeyRequestSchema,
  RedactedAPIKey,
  RedactedAPIKeySchema,
} from "@/api/types";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import { putAPIKey, getAccount, getAPIKeys } from "@/api/db";
import { isAuthorized } from "@/api/authz";
import { generateAccessKeyID, generateSecretAccessKey } from "@/api/utils";

// POST /api/v1/accounts/[account_id]/api-keys
export async function POST(
  request: Request,
  { params }: { params: { account_id: string } }
) {
  try {
    const session = await getServerSession();
    const { account_id } = params;
    const body = await request.json();
    const apiKeyRequest: APIKeyRequest = APIKeyRequestSchema.parse(body);

    if (Date.parse(apiKeyRequest.expires) <= Date.now()) {
      return NextResponse.json(
        { error: "API key expiration date must be in the future" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    const account = await getAccount(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account with ID ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }

    let [apiKeyCreated, success]: [APIKey | null, boolean] = [null, false];
    do {
      let apiKey: APIKey = {
        ...apiKeyRequest,
        disabled: false,
        account_id: account.account_id,
        access_key_id: generateAccessKeyID(),
        secret_access_key: generateSecretAccessKey(),
      };
      if (!isAuthorized(session, apiKey, Actions.CreateAPIKey)) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: StatusCodes.UNAUTHORIZED }
        );
      }
      [apiKeyCreated, success] = await putAPIKey(apiKey, true);
      if (success) {
        return NextResponse.json(apiKeyCreated, { status: StatusCodes.OK });
      }
    } while (!success);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

// GET /api/v1/accounts/[account_id]/api-keys
export async function GET(
  request: Request,
  { params }: { params: { account_id: string } }
) {
  try {
    const session = await getServerSession();
    const { account_id } = params;
    const account = await getAccount(account_id);
    if (!account) {
      return NextResponse.json(
        { error: `Account with ID ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, account, Actions.ListAccountAPIKeys)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const apiKeys = await getAPIKeys(account.account_id);
    const redactedAPIKeys: RedactedAPIKey[] = [];
    for (const apiKey of apiKeys) {
      if (isAuthorized(session, apiKey, Actions.GetAPIKey)) {
        redactedAPIKeys.push(RedactedAPIKeySchema.parse(apiKey));
      }
    }
    return NextResponse.json(redactedAPIKeys, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
