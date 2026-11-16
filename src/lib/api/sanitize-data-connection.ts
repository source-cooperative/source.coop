import {
  DataConnection,
  DataConnectionObjectSchema,
  DataConnectionSchema,
  isSecretBearingAuth,
} from "@/types";

/**
 * Strip a data connection's *secret-bearing* `authentication` (static S3 keys /
 * SAS tokens) from a read response. These secrets are write-only — they never
 * leave the database via the API, for any caller (admins included); rotate by
 * writing a new value.
 *
 * Secret-less `authentication` (federated role ARN / workload identity) is *not*
 * a credential — the customer's IAM trust policy is the security boundary, so
 * the ARN grants nothing on its own — and is returned to any caller (the proxy
 * reads it impersonating the end user), like the connection's `details`.
 */
export function sanitizeDataConnection(
  connection: DataConnection
): DataConnection {
  const auth = connection.authentication;
  if (auth !== undefined && !isSecretBearingAuth(auth)) {
    return DataConnectionSchema.parse(connection);
  }

  return DataConnectionObjectSchema.omit({ authentication: true }).parse(
    connection
  );
}
