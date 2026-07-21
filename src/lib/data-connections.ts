import { Actions, DataConnection, UserSession } from "@/types";
import {
  isAuthorized,
  isAdmin,
  canManageAccountDataConnections,
} from "@/lib/api/authz";
import { accountsTable, dataConnectionsTable } from "@/lib/clients/database";

/**
 * Whether `session` may manage (edit/delete) the connection *itself*: admins
 * can manage any; a system-owned (unowned) connection is admin-only; an
 * account-owned connection is managed by that account's owners/maintainers
 * (canManageAccountDataConnections, which also requires the account's
 * CREATE_DATA_CONNECTIONS flag).
 *
 * This mirrors the rule the private `canManageConnection` in
 * actions/data-connections.ts applies to connection CRUD, but computes the
 * admin decision itself instead of taking it as a param, so non-action callers
 * (e.g. the product mirror-prefix action) can reuse it.
 */
export async function canManageDataConnection(
  session: UserSession | null,
  connection: DataConnection
): Promise<boolean> {
  if (session?.account?.disabled) {
    return false;
  }
  if (isAdmin(session)) {
    return true;
  }
  // System-owned connections are admin-only.
  if (!connection.owner) {
    return false;
  }
  const ownerAccount = await accountsTable.fetchById(connection.owner);
  if (!ownerAccount) {
    return false;
  }
  return canManageAccountDataConnections(session, ownerAccount);
}

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
