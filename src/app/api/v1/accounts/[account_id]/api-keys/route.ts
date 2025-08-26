import { NextRequest, NextResponse } from "next/server";
import {
  Actions,
  APIKey,
  APIKeyRequest,
  APIKeyRequestSchema,
  RedactedAPIKey,
  RedactedAPIKeySchema,
} from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import {
  generateAccessKeyID,
  generateSecretAccessKey,
} from "@/lib/actions/crypto";
import { apiKeysTable } from "@/lib/clients/database";

// POST /api/v1/accounts/[account_id]/api-keys
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = await params;
    const body = await request.json();
    const apiKeyRequest: APIKeyRequest = APIKeyRequestSchema.parse(body);

    if (Date.parse(apiKeyRequest.expires) <= Date.now()) {
      return NextResponse.json(
        { error: "API key expiration date must be in the future" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }

    const account = session?.account;
    if (!account) {
      return NextResponse.json(
        { error: `Account with ID ${account_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }

    const [apiKeyCreated, success]: [APIKey | null, boolean] = [null, false];
    let attempts = 0;
    do {
      const apiKey: APIKey = {
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
      try {
        const apiKeyCreated = await apiKeysTable.create(apiKey);
        return NextResponse.json(apiKeyCreated, { status: StatusCodes.OK });
      } catch (error) {
        if (attempts > 3) {
          throw error;
        }
        attempts++;
      }
    } while (!success);
    return NextResponse.json(apiKeyCreated, { status: StatusCodes.OK });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

// GET /api/v1/accounts/[account_id]/api-keys
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { account_id } = await params;
    const account = session?.account;
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
    const apiKeys = await apiKeysTable.listByAccount(account.account_id);
    const redactedAPIKeys: RedactedAPIKey[] = [];
    for (const apiKey of apiKeys) {
      if (isAuthorized(session, apiKey, Actions.GetAPIKey)) {
        redactedAPIKeys.push(RedactedAPIKeySchema.parse(apiKey));
      }
    }
    return NextResponse.json(redactedAPIKeys, { status: StatusCodes.OK });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
