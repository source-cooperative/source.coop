import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/api/utils";
import { Actions, DataConnectionSchema, DataConnection } from "@/api/types";
import { withErrorHandling } from "@/api/middleware";
import { StatusCodes } from "http-status-codes";
import {
  MethodNotImplementedError,
  NotFoundError,
  UnauthorizedError,
} from "@/api/errors";
import { isAuthorized } from "@/api/authz";
import { putDataConnection, getDataConnection } from "@/api/db";

/**
 * @openapi
 * /data-connections/{data_connection_id}:
 *   get:
 *     tags: [Data Connections]
 *     summary: Get a data connection
 *     description: Retrieves a data connection by its ID. Authentication credentials are only included for users with the appropriate permissions.
 *     parameters:
 *       - in: path
 *         name: data_connection_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved the data connection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DataConnection'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Data connection with the given ID does not exist
 *       500:
 *         description: Internal server error
 */
async function getDataConnectionHandler(
  req: NextApiRequest,
  res: NextApiResponse<DataConnection>
): Promise<void> {
  const session = await getSession(req);

  const { data_connection_id } = req.query;

  var dataConnection = await getDataConnection(data_connection_id as string);

  if (!dataConnection) {
    throw new NotFoundError(
      `Data connection with ID ${data_connection_id} not found`
    );
  }

  const { authorization } = req.headers;
  if (authorization === process.env.SOURCE_KEY) {
    res.status(StatusCodes.OK).json(dataConnection);
  } else {
    if (!isAuthorized(session, dataConnection, Actions.GetDataConnection)) {
      throw new UnauthorizedError();
    }

    if (
      !isAuthorized(
        session,
        dataConnection,
        Actions.ViewDataConnectionCredentials
      )
    ) {
      dataConnection = DataConnectionSchema.omit({
        authentication: true,
      }).parse(dataConnection);
    }

    res.status(StatusCodes.OK).json(dataConnection);
  }
}

/**
 * @openapi
 * /data-connections/{data_connection_id}:
 *   put:
 *     tags: [Data Connections]
 *     summary: Update a data connection
 *     description: Updates an existing data connection. Only users with the appropriate permissions can update data connections.
 *     parameters:
 *       - in: path
 *         name: data_connection_id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DataConnection'
 *     responses:
 *       200:
 *         description: Successfully updated the data connection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DataConnection'
 *       400:
 *         description: Bad Request - Invalid data connection data
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Data connection with the given ID does not exist
 *       500:
 *         description: Internal server error
 */
async function putDataConnectionHandler(
  req: NextApiRequest,
  res: NextApiResponse<DataConnection>
): Promise<void> {
  const session = await getSession(req);

  const { data_connection_id } = req.query;

  var dataConnection = await getDataConnection(data_connection_id as string);

  if (!dataConnection) {
    throw new NotFoundError(
      `Data connection with ID ${data_connection_id} not found`
    );
  }

  dataConnection = DataConnectionSchema.parse(req.body);

  if (!isAuthorized(session, dataConnection, Actions.PutDataConnection)) {
    throw new UnauthorizedError();
  }

  const [updatedDataConnection, success] = await putDataConnection(
    dataConnection
  );

  res.status(StatusCodes.OK).json(updatedDataConnection);
}

/**
 * @openapi
 * /data-connections/{data_connection_id}:
 *   delete:
 *     tags: [Data Connections]
 *     summary: Disable a data connection
 *     description: Disables a data connection by setting it to read-only. Only users with the appropriate permissions can disable data connections.
 *     parameters:
 *       - in: path
 *         name: data_connection_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully disabled the data connection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DataConnection'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Data connection with the given ID does not exist
 *       500:
 *         description: Internal server error
 */
async function disableDataConnectionHandler(
  req: NextApiRequest,
  res: NextApiResponse<DataConnection>
): Promise<void> {
  const session = await getSession(req);

  const { data_connection_id } = req.query;

  var dataConnection = await getDataConnection(data_connection_id as string);

  if (!dataConnection) {
    throw new NotFoundError(
      `Data connection with ID ${data_connection_id} not found`
    );
  }

  if (!isAuthorized(session, dataConnection, Actions.DisableDataConnection)) {
    throw new UnauthorizedError();
  }

  dataConnection.read_only = true;

  var [updatedDataConnection, success] = await putDataConnection(
    dataConnection
  );

  if (
    !isAuthorized(
      session,
      updatedDataConnection,
      Actions.ViewDataConnectionCredentials
    )
  ) {
    updatedDataConnection = DataConnectionSchema.omit({
      authentication: true,
    }).parse(updatedDataConnection);
  }

  res.status(StatusCodes.OK).json(updatedDataConnection);
}

export async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DataConnection>
) {
  if (req.method === "GET") {
    return getDataConnectionHandler(req, res);
  } else if (req.method === "PUT") {
    return putDataConnectionHandler(req, res);
  } else if (req.method === "DELETE") {
    return disableDataConnectionHandler(req, res);
  }

  throw new MethodNotImplementedError();
}

export default withErrorHandling(handler);
