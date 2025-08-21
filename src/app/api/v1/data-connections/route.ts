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
import { NextRequest, NextResponse } from "next/server";
import { Actions, DataConnectionSchema, DataConnection } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { dataConnectionsTable } from "@/lib/clients/database";

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);

    const dataConnections = await dataConnectionsTable.listAll();
    const filteredConnections = dataConnections.filter((dataConnection) =>
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
    return NextResponse.json(sanitizedConnections, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
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
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession(request);
    const body = await request.json();
    const dataConnection = DataConnectionSchema.parse(body);
    if (!isAuthorized(session, dataConnection, Actions.CreateDataConnection)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    try {
      const createdDataConnection = await dataConnectionsTable.create(
        dataConnection
      );
      return NextResponse.json(createdDataConnection, {
        status: StatusCodes.OK,
      });
    } catch (e) {
      console.error(`Error creating data connection: ${e}`);
      return NextResponse.json(
        {
          error: `Data connection with ID ${dataConnection.data_connection_id} already exists`,
        },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
