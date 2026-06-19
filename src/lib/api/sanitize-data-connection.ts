import {
  Actions,
  DataConnection,
  DataConnectionAuthenticationType,
  DataConnectionCacheLevel,
  DataConnectionObjectSchema,
  DataConnectionSchema,
  isSecretBearingAuth,
  UserSession,
} from "@/types";
import { canViewDataConnectionConfig, isAuthorized } from "./authz";

/**
 * The proxy's federated-credential cache granularity is derived, not stored:
 * an unowned connection is the Source-managed shared one (~99% of products), so
 * it caches one credential for the whole connection (`system`); an owned
 * connection caches per-product (`product`, always safe). Attached to the
 * federated `authentication` the proxy reads; a no-op for every other auth type.
 */
function withDerivedCacheLevel(connection: DataConnection): DataConnection {
  const auth = connection.authentication;
  if (auth?.type !== DataConnectionAuthenticationType.S3WebIdentityRole) {
    return connection;
  }
  return {
    ...connection,
    authentication: {
      ...auth,
      cache_level: connection.owner
        ? DataConnectionCacheLevel.Product
        : DataConnectionCacheLevel.System,
    },
  };
}

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
    return withDerivedCacheLevel(DataConnectionSchema.parse(connection));
  }

  const auth = connection.authentication;
  const keepSecretlessConfig =
    auth !== undefined &&
    !isSecretBearingAuth(auth) &&
    canViewDataConnectionConfig(principal, connection);

  if (keepSecretlessConfig) {
    return withDerivedCacheLevel(DataConnectionSchema.parse(connection));
  }

  return DataConnectionObjectSchema.omit({ authentication: true }).parse(
    connection
  );
}
