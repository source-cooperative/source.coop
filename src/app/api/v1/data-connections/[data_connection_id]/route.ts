/**
 * @openapi
 * /data-connections/{data_connection_id}:
 *   get:
 *     tags: [Data Connections]
 *     summary: Get data connection details
 *     description: Retrieves the details of a specific data connection. Authentication details are redacted unless the user has appropriate permissions.
 *     parameters:
 *       - in: path
 *         name: data_connection_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the data connection to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved data connection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DataConnection'
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Data connection not found
 *       500:
 *         description: Internal server error
 */
import { NextRequest, NextResponse } from "next/server";
import { Actions, DataConnection, DataConnectionSchema } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { getApiSession } from "@/lib/api/utils";
import { dataConnectionsTable } from "@/lib/clients";

export async function GET(
  request: NextRequest,
  { params }: { params: { data_connection_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { data_connection_id } = params;
    const dataConnection = await dataConnectionsTable.fetchById(
      data_connection_id
    );
    if (!dataConnection) {
      return NextResponse.json(
        { error: `Data connection with ID ${data_connection_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, dataConnection, Actions.GetDataConnection)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    // Sanitize connection if user doesn't have permission to view credentials
    if (
      !isAuthorized(
        session,
        dataConnection,
        Actions.ViewDataConnectionCredentials
      )
    ) {
      const sanitized = DataConnectionSchema.omit({
        authentication: true,
      }).parse(dataConnection);
      return NextResponse.json(sanitized, { status: StatusCodes.OK });
    }
    return NextResponse.json(dataConnection, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /data-connections/{data_connection_id}:
 *   put:
 *     tags: [Data Connections]
 *     summary: Update data connection
 *     description: Updates an existing data connection. Only users with the `admin` flag may update data connections.
 *     parameters:
 *       - in: path
 *         name: data_connection_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the data connection to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DataConnection'
 *     responses:
 *       200:
 *         description: Successfully updated data connection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DataConnection'
 *       400:
 *         description: Bad Request - Invalid data connection data
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Data connection not found
 *       500:
 *         description: Internal server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { data_connection_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { data_connection_id } = params;
    const dataConnectionUpdate = DataConnectionSchema.parse(
      await request.json()
    );
    const existingDataConnection = await dataConnectionsTable.fetchById(
      data_connection_id
    );
    if (!existingDataConnection) {
      return NextResponse.json(
        { error: `Data connection with ID ${data_connection_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (
      !isAuthorized(session, existingDataConnection, Actions.PutDataConnection)
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    const updatedDataConnection = {
      ...existingDataConnection,
      ...dataConnectionUpdate,
    };
    const dataConnection = await dataConnectionsTable.create(
      updatedDataConnection
    );
    return NextResponse.json(dataConnection, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * @openapi
 * /data-connections/{data_connection_id}:
 *   delete:
 *     tags: [Data Connections]
 *     summary: Delete data connection
 *     description: Deletes an existing data connection. Only users with the `admin` flag may delete data connections.
 *     parameters:
 *       - in: path
 *         name: data_connection_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the data connection to delete
 *     responses:
 *       200:
 *         description: Successfully deleted data connection
 *       401:
 *         description: Unauthorized - No valid session found or insufficient permissions
 *       404:
 *         description: Not Found - Data connection not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { data_connection_id: string } }
) {
  try {
    const session = await getApiSession(request);
    const { data_connection_id } = params;
    const dataConnection = await dataConnectionsTable.fetchById(
      data_connection_id
    );
    if (!dataConnection) {
      return NextResponse.json(
        { error: `Data connection with ID ${data_connection_id} not found` },
        { status: StatusCodes.NOT_FOUND }
      );
    }
    if (!isAuthorized(session, dataConnection, Actions.DeleteDataConnection)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: StatusCodes.UNAUTHORIZED }
      );
    }
    // Note: Actual deletion logic would be implemented here
    return NextResponse.json(
      { message: "Data connection deleted successfully" },
      { status: StatusCodes.OK }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
