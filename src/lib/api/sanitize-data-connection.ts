import {
  Actions,
  DataConnection,
  DataConnectionObjectSchema,
  DataConnectionSchema,
  isSecretBearingAuth,
  UserSession,
} from "@/types";
import { canViewDataConnectionConfig, isAuthorized } from "./authz";

/**
 * Redact a data connection's `authentication` for a read response.
 *
 * - **Credential viewers** (admins, `ViewDataConnectionCredentials`) → full
 *   connection, secrets included.
 * - Otherwise, a **secret-less** `authentication` (federated role ARN /
 *   workload identity) is kept iff the caller may view the connection's config
 *   (see {@link canViewDataConnectionConfig}).
 * - **Secret-bearing** `authentication` (static keys/tokens), and any config the
 *   caller isn't allowed to see, are stripped.
 *
 * Connections with no `authentication` pass through unchanged.
 */
export function sanitizeDataConnection(
  connection: DataConnection,
  principal: UserSession | null
): DataConnection {
  if (
    isAuthorized(principal, connection, Actions.ViewDataConnectionCredentials)
  ) {
    return DataConnectionSchema.parse(connection);
  }

  const auth = connection.authentication;
  const keepSecretlessConfig =
    auth !== undefined &&
    !isSecretBearingAuth(auth) &&
    canViewDataConnectionConfig(principal, connection);

  if (keepSecretlessConfig) {
    return DataConnectionSchema.parse(connection);
  }

  return DataConnectionObjectSchema.omit({ authentication: true }).parse(
    connection
  );
}
