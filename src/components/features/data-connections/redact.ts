import {
  DataConnection,
  DataConnectionAuthentication,
  DataConnectionAuthenticationType,
} from "@/types";

/**
 * Authentication with the secret fields removed. Server components must never
 * pass raw `DataConnection.authentication` (which holds access keys / SAS
 * tokens) into a client component: React serializes every prop into the RSC
 * payload sent to the browser, regardless of which fields the component renders.
 * These redacted shapes keep only the non-secret, admin-editable config (role
 * ARNs, workload-identity IDs) plus the discriminating `type`.
 */
export type RedactedAuthentication =
  | { type: DataConnectionAuthenticationType.S3AccessKey }
  | { type: DataConnectionAuthenticationType.AzureSasToken }
  | { type: DataConnectionAuthenticationType.S3ECSTaskRole }
  | { type: DataConnectionAuthenticationType.S3Local }
  | { type: DataConnectionAuthenticationType.S3WebIdentityRole; role_arn: string }
  | {
      type: DataConnectionAuthenticationType.GcpWorkloadIdentity;
      workload_identity_provider: string;
      service_account: string;
    }
  | {
      type: DataConnectionAuthenticationType.AzureWorkloadIdentity;
      tenant_id: string;
      client_id: string;
    };

/** A `DataConnection` safe to hand to a client component (no secrets). */
export type EditableDataConnection = Omit<DataConnection, "authentication"> & {
  authentication?: RedactedAuthentication;
};

function redactAuthentication(
  auth: DataConnectionAuthentication
): RedactedAuthentication {
  switch (auth.type) {
    case DataConnectionAuthenticationType.S3WebIdentityRole:
      return { type: auth.type, role_arn: auth.role_arn };
    case DataConnectionAuthenticationType.GcpWorkloadIdentity:
      return {
        type: auth.type,
        workload_identity_provider: auth.workload_identity_provider,
        service_account: auth.service_account,
      };
    case DataConnectionAuthenticationType.AzureWorkloadIdentity:
      return {
        type: auth.type,
        tenant_id: auth.tenant_id,
        client_id: auth.client_id,
      };
    case DataConnectionAuthenticationType.S3AccessKey:
    case DataConnectionAuthenticationType.AzureSasToken:
    case DataConnectionAuthenticationType.S3ECSTaskRole:
    case DataConnectionAuthenticationType.S3Local:
      return { type: auth.type };
  }
}

/** Strip secrets from a connection before passing it to the edit form. */
export function toEditableDataConnection(
  dataConnection: DataConnection
): EditableDataConnection {
  const { authentication, ...rest } = dataConnection;
  return {
    ...rest,
    authentication: authentication
      ? redactAuthentication(authentication)
      : undefined,
  };
}

/** Minimal, secret-free connection shape for the product mirror picker. */
export interface DataConnectionOption {
  data_connection_id: string;
  name: string;
  provider: string;
  region: string;
}

export function toDataConnectionOption(
  dataConnection: DataConnection
): DataConnectionOption {
  const details = dataConnection.details;
  return {
    data_connection_id: dataConnection.data_connection_id,
    name: dataConnection.name,
    provider: details.provider,
    // GCS connections carry no region.
    region: "region" in details ? details.region : "",
  };
}
