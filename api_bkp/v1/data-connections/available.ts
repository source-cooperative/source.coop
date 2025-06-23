import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { Actions, DataConnectionSchema, DataConnection } from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import { MethodNotImplementedError } from "@/api/errors";
import { isAuthorized } from "@/api/authz";
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
  req: NextApiRequest,
  res: NextApiResponse<DataConnection[]>
): Promise<void> {
  const session = await getSession(req);

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
  req: NextApiRequest,
  res: NextApiResponse<DataConnection[] | DataConnection>
) {
  if (req.method === "GET") {
    return listAvailableDataConnectionsHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
