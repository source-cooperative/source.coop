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

export type DataConnectionDenial = "not-usable" | "wrong-account";

/**
 * Why `connection` may not back a product owned by `accountId`, or null if it
 * may. Two rules: the connection itself must permit the caller
 * (`not-usable` — `UseDataConnection` covers flag-gated connections), and it
 * must be available to that account — either system-level (unowned) or owned
 * by it (`wrong-account`).
 *
 * The reason is returned rather than a bare boolean so `createProduct` can
 * surface each rule as its own form field error; callers that only need a
 * yes/no use `canUseDataConnectionFor`.
 *
 * This is only the connection half of associating the two; the caller side is
 * each call site's own gate — `canManageAccount` on the owning account for the
 * mirror actions, `Actions.CreateRepository` for `createProduct`.
 */
export function denyDataConnectionFor(
  session: UserSession | null,
  connection: DataConnection,
  accountId: string
): DataConnectionDenial | null {
  if (!isAuthorized(session, connection, Actions.UseDataConnection)) {
    return "not-usable";
  }
  if (connection.owner && connection.owner !== accountId) {
    return "wrong-account";
  }
  return null;
}

/** Boolean form of {@link denyDataConnectionFor}. */
export function canUseDataConnectionFor(
  session: UserSession | null,
  connection: DataConnection,
  accountId: string
): boolean {
  return denyDataConnectionFor(session, connection, accountId) === null;
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
