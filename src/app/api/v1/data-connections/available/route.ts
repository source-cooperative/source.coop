import { NextRequest, NextResponse } from "next/server";
import { Actions, DataConnectionSchema, DataConnection } from "@/types";
import { getApiSession } from "@/lib/api/utils";
import { StatusCodes } from "http-status-codes";
import { isAuthorized } from "@/lib/api/authz";
import { dataConnectionsTable } from "@/lib/clients/database";

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
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession(request);

    const dataConnections: DataConnection[] =
      await dataConnectionsTable.listAll();

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

    return NextResponse.json(sanitizedConnections, { status: StatusCodes.OK });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    );
  }
}
