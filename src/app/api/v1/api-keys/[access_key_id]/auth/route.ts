import { NextRequest, NextResponse } from "next/server";
import { StatusCodes } from "http-status-codes";
import { apiKeysTable } from "@/lib/clients/database";

// TODO: This route seems generally insecure. Exposing keys to anyone with the source key seems like a bad idea.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ access_key_id: string }> }
) {
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) {
      return NextResponse.json(
        { error: "Authorization header is required" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    if (authorization !== process.env.SOURCE_KEY) {
      return NextResponse.json(
        { error: "Invalid authorization header" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }

    const { access_key_id } = await params;
    const apiKey = await apiKeysTable.fetchById(access_key_id);
    if (!apiKey) {
      return NextResponse.json(
        { error: `API key with ID ${access_key_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (apiKey.disabled) {
      return NextResponse.json(
        { error: "API key is disabled" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    return NextResponse.json(apiKey, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
