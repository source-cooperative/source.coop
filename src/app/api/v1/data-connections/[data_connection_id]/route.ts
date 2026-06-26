/**
 * @openapi
 * /data-connections/{data_connection_id}:
 *   get:
 *     tags: [Data Connections]
 *     summary: Get data connection details
 *     description: Retrieves the details of a specific data connection. Secret-bearing authentication (static keys/tokens) is always stripped; secret-less federated config (role ARN, workload-identity IDs) is returned to any authorized caller.
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
import { Actions, DataConnectionSchema } from "@/types";
import { StatusCodes } from "http-status-codes";
import { isAdmin, isAuthorized } from "@/lib/api/authz";
import { sanitizeDataConnection } from "@/lib/api/sanitize-data-connection";
import { getApiSession } from "@/lib/api/utils";
import { dataConnectionsTable } from "@/lib/clients";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ data_connection_id: string }> }
) {
  try {
    const session = await getApiSession(request);

    const { data_connection_id } = await params;
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

    // sanitizeDataConnection strips secret-bearing authentication (write-only).
    const sanitized = sanitizeDataConnection(dataConnection);

    return NextResponse.json(sanitized, { status: StatusCodes.OK });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
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
  { params }: { params: Promise<{ data_connection_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { data_connection_id } = await params;
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
    // Admin-only route: the spread lets the body overwrite any field, including
    // `owner` (now load-bearing for account-scoped authz). Acceptable since only
    // platform admins reach here; the account-scoped server actions preserve it.
    const updatedDataConnection = {
      ...existingDataConnection,
      ...dataConnectionUpdate,
    };
    // update() (attribute_exists guard), not create() (attribute_not_exists):
    // the connection already exists, so create() would fail its condition → 500.
    const dataConnection = await dataConnectionsTable.update(
      updatedDataConnection
    );
    const sanitized = sanitizeDataConnection(dataConnection);
    return NextResponse.json(sanitized, { status: StatusCodes.OK });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
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
  { params }: { params: Promise<{ data_connection_id: string }> }
) {
  try {
    const session = await getApiSession(request);
    const { data_connection_id } = await params;
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
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
