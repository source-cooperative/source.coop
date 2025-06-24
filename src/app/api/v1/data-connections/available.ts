import type { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@ory/nextjs/app";
import { Actions, DataConnectionSchema, DataConnection } from "@/types";
import { withErrorHandling } from "@/lib/api/utils";
import { StatusCodes } from "http-status-codes";
import { MethodNotImplementedError } from "@/lib/api/errors";
import { isAuthorized } from "@/lib/api/authz";
import { getDataConnections } from "@/api/db";
/**
 * @openapi
 * /data-connections/available:
 *   get:
 *     tags: [Data Connections]
 *     summary: List data connections available to the user for repository creation
 *     description: Retrieves a list of data connections which the user is allowed to use for creating repositories. The list is sanitized of data connection credentials based on the user's permissions.
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of data connections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DataConnection'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
async function listAvailableDataConnectionsHandler(
  req: NextRequest,
  res: NextResponse<DataConnection[]>
): Promise<void> {
  const session = await getApiSession(request);

  const dataConnections: DataConnection[] = await getDataConnections();

  const filteredConnections = dataConnections.filter(
    (dataConnection) =>
      isAuthorized(session, dataConnection, Actions.UseDataConnection) &&
      isAuthorized(session, dataConnection, Actions.GetDataConnection)
  );

  const sanitizedConnections = filteredConnections.map((connection) => {
    const sanitized = DataConnectionSchema.omit({
      authentication: true,
    }).parse(connection);

    if (
      isAuthorized(session, connection, Actions.ViewDataConnectionCredentials)
    ) {
      return DataConnectionSchema.parse(connection);
    }

    return sanitized;
  });

  res.status(StatusCodes.OK).json(sanitizedConnections);
}

export async function handler(
  req: NextRequest,
  res: NextResponse<DataConnection[] | DataConnection>
) {
  if (req.method === "GET") {
    return listAvailableDataConnectionsHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
