import { Actions, DataConnection, UserSession } from "@/types";
import { isAuthorized } from "@/lib/api/authz";
import { dataConnectionsTable } from "@/lib/clients/database";

/**
 * List the data connections a user is permitted to use when creating a product.
 *
 * A connection is usable when the session is authorized both to read it
 * (`GetDataConnection`) and to create products against it (`UseDataConnection`).
 * The returned objects are unsanitized (credentials intact); callers that hand
 * these to the client must strip `authentication` first.
 */
export async function listUsableDataConnections(
  session: UserSession | null
): Promise<DataConnection[]> {
  const dataConnections = await dataConnectionsTable.listAll();

  return dataConnections.filter(
    (dataConnection) =>
      isAuthorized(session, dataConnection, Actions.UseDataConnection) &&
      isAuthorized(session, dataConnection, Actions.GetDataConnection)
  );
}
