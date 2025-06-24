// Import necessary modules and types
import type { NextRequest, NextResponse } from "next/server";
import { APIKey } from "@/types";
import { withErrorHandling } from "@/lib/api/utils";
import { StatusCodes } from "http-status-codes";
import {
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/lib/api/errors";
import { getAPIKey } from "@/api/db";

async function getAPIKeyHandler(
  req: NextRequest,
  res: NextResponse<APIKey>
): Promise<void> {
  const { authorization } = req.headers;

  if (!authorization) {
    throw new UnauthorizedError();
  }

  if (authorization !== process.env.SOURCE_KEY) {
    throw new UnauthorizedError();
  }

  const { access_key_id } = req.query;

  // Fetch the API key
  const apiKey = await getAPIKey(access_key_id as string);

  if (!apiKey || apiKey.disabled) {
    throw new NotFoundError(`API key with ID ${access_key_id} not found`);
  }

  // Send the API key as the response
  res.status(StatusCodes.OK).json(apiKey);
}

// Handler function for the API route
export async function handler(req: NextRequest, res: NextResponse<APIKey>) {
  // Check if the request method is DELETE
  if (req.method === "GET") {
    return getAPIKeyHandler(req, res);
  }

  // If the method is not GET, throw an error
  throw new MethodNotImplementedError();
}

// Export the handler with error handling middleware
export default withErrorHandling(handler);
