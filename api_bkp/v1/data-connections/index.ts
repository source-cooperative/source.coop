import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { Actions, DataConnectionSchema, DataConnection } from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  MethodNotImplementedError,
  UnauthorizedError,
} from "@/api/errors";
import { isAuthorized } from "@/api/authz";
import { getDataConnections, putDataConnection } from "@/api/db";

/**
 * @openapi
 * /data-connections:
 *   get:
 *     tags: [Data Connections]
 *     summary: List data connections
 *     description: Retrieves a list of data connections. The list is sanitized of data connection credentials based on the user's permissions.
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of data connections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DataConnection'
 *       500:
 *         description: Internal server error
 */
async function listDataConnectionsHandler(
  req: NextApiRequest,
  res: NextApiResponse<DataConnection[]>
): Promise<void> {
  const session = await getSession(req);

  const dataConnections: DataConnection[] = await getDataConnections();

  // Filter connections based on user's permissions
  const filteredConnections = dataConnections.filter((dataConnection) =>
    isAuthorized(session, dataConnection, Actions.GetDataConnection)
  );

  // Sanitize connections, removing authentication details if not authorized
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

/**
 * @openapi
 * /data-connections:
 *   post:
 *     tags: [Data Connections]
 *     summary: Create a new data connection
 *     description: Creates a new data connection. Only users with the `admin` flag may create data connections.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DataConnection'
 *     responses:
 *       200:
 *         description: Successfully created the data connection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DataConnection'
 *       400:
 *         description: Bad Request - Invalid data connection data or data connection already exists
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       500:
 *         description: Internal server error
 */
async function createDataConnectionHandler(
  req: NextApiRequest,
  res: NextApiResponse<DataConnection>
): Promise<void> {
  const session = await getSession(req);

  const dataConnection = DataConnectionSchema.parse(req.body);

  if (!isAuthorized(session, dataConnection, Actions.CreateDataConnection)) {
    throw new UnauthorizedError();
  }

  const [createdDataConnection, success] = await putDataConnection(
    dataConnection,
    true
  );

  if (!success) {
    throw new BadRequestError(
      `Data connection with ID ${dataConnection.data_connection_id} already exists`
    );
  }

  res.status(StatusCodes.OK).json(createdDataConnection);
}

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DataConnection[] | DataConnection>
) {
  if (req.method === "GET") {
    return listDataConnectionsHandler(req, res);
  } else if (req.method === "POST") {
    return createDataConnectionHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
