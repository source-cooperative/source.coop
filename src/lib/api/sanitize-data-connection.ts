import {
  Actions,
  DataConnection,
  DataConnectionObjectSchema,
  DataConnectionSchema,
  isSecretBearingAuth,
  UserSession,
} from "@/types";
import { isAuthorized } from "./authz";

/**
 * Redact a data connection's `authentication` for a read response.
 *
 * - **Secret-bearing** `authentication` (static keys / SAS tokens) is stripped
 *   unless the caller is a credential viewer (admin /
 *   `ViewDataConnectionCredentials`). Leaking it = direct backend access.
 * - **Secret-less** `authentication` (federated role ARN / workload identity) is
 *   *not* a credential — the customer's IAM trust policy is the security
 *   boundary, so the ARN grants nothing on its own — and is returned to any
 *   caller (the proxy reads it impersonating the end user). Like the
 *   connection's `details`, it carries nothing exploitable.
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
  if (auth !== undefined && !isSecretBearingAuth(auth)) {
    return DataConnectionSchema.parse(connection);
  }

  return DataConnectionObjectSchema.omit({ authentication: true }).parse(
    connection
  );
}
