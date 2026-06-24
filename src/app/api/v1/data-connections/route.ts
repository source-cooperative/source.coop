/**
 * @openapi
 * /data-connections:
 *   get:
 *     tags: [Data Connections]
 *     summary: List data connections
 *     description: Retrieves a list of data connections. Secret-bearing authentication (static keys/tokens) is always stripped; secret-less federated config (role ARN, workload-identity IDs) is returned to any authorized caller.
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
import { Actions, DataConnectionSchema } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { sanitizeDataConnection } from "@/lib/api/sanitize-data-connection";
import { getApiSession } from "@/lib/api/utils";
import { dataConnectionsTable } from "@/lib/clients/database";
import { LOGGER } from "@/lib";

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);

    const dataConnections = await dataConnectionsTable.listAll();
    const filteredConnections = dataConnections.filter((dataConnection) =>
      isAuthorized(session, dataConnection, Actions.GetDataConnection)
    );
    // sanitizeDataConnection strips secret-bearing authentication (write-only).
    const sanitizedConnections = filteredConnections.map((connection) =>
      sanitizeDataConnection(connection)
    );

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
    // `--` is reserved as the account-namespacing delimiter (`owner--slug`).
    // The schema regex permits it for namespaced ids; reject it on unowned
    // (admin-created) ids so an admin can't squat an account's slug namespace.
    if (
      !dataConnection.owner &&
      dataConnection.data_connection_id.includes("--")
    ) {
      return NextResponse.json(
        { error: "ID may not contain consecutive hyphens (--)" },
        { status: StatusCodes.BAD_REQUEST }
      );
    }
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
      // Strip secret-bearing auth from the create response too (write-only).
      return NextResponse.json(sanitizeDataConnection(createdDataConnection), {
        status: StatusCodes.OK,
      });
    } catch (e) {
      LOGGER.error("Error creating data connection", {
        operation: "data-connections.POST",
        context: "data connection creation",
        error: e,
      });
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
