/**
 * @fileoverview Type definitions and schemas for Data Connection entities.
 *
 * This module defines the core data structures, enums, and Zod schemas used for
 * data connection management in the Source Cooperative application.
 *
 * @module types/data-connection
 * @requires zod
 * @requires @asteasolutions/zod-to-openapi
 */

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { MIN_ID_LENGTH, MAX_ID_LENGTH, ID_REGEX, AccountFlags } from "./shared";
import { ProductVisibility } from "./product";

extendZodWithOpenApi(z);

export enum DataProvider {
  S3 = "s3",
  Azure = "az",
  GCP = "gcp",
}

export enum S3Regions {
  /**
   * For S3-compatible backends (e.g. Cloudflare R2) that don't use an AWS
   * region. Pair with a custom `endpoint` on the connection.
   */
  AUTO = "auto",
  AF_SOUTH_1 = "af-south-1",
  AP_EAST_1 = "ap-east-1",
  AP_NORTHEAST_1 = "ap-northeast-1",
  AP_NORTHEAST_2 = "ap-northeast-2",
  AP_NORTHEAST_3 = "ap-northeast-3",
  AP_SOUTH_1 = "ap-south-1",
  AP_SOUTH_2 = "ap-south-2",
  AP_SOUTHEAST_1 = "ap-southeast-1",
  AP_SOUTHEAST_2 = "ap-southeast-2",
  AP_SOUTHEAST_3 = "ap-southeast-3",
  AP_SOUTHEAST_4 = "ap-southeast-4",
  AP_SOUTHEAST_5 = "ap-southeast-5",
  CA_CENTRAL_1 = "ca-central-1",
  CA_WEST_1 = "ca-west-1",
  CN_NORTH_1 = "cn-north-1",
  CN_NORTHWEST_1 = "cn-northwest-1",
  EU_CENTRAL_1 = "eu-central-1",
  EU_CENTRAL_2 = "eu-central-2",
  EU_NORTH_1 = "eu-north-1",
  EU_SOUTH_1 = "eu-south-1",
  EU_SOUTH_2 = "eu-south-2",
  EU_WEST_1 = "eu-west-1",
  EU_WEST_2 = "eu-west-2",
  EU_WEST_3 = "eu-west-3",
  IL_CENTRAL_1 = "il-central-1",
  ME_CENTRAL_1 = "me-central-1",
  ME_SOUTH_1 = "me-south-1",
  SA_EAST_1 = "sa-east-1",
  US_EAST_1 = "us-east-1",
  US_EAST_2 = "us-east-2",
  US_GOV_EAST_1 = "us-gov-east-1",
  US_GOV_WEST_1 = "us-gov-west-1",
  US_WEST_1 = "us-west-1",
  US_WEST_2 = "us-west-2",
}

export enum AzureRegions {
  WEST_EUROPE = "westeurope",
}

export enum DataConnectionAuthenticationType {
  S3AccessKey = "s3_access_key",
  /**
   * V2 federated backend access: the proxy presents its own OIDC identity to the
   * data provider's AWS account and assumes `role_arn` via
   * `AssumeRoleWithWebIdentity`, so no long-lived backend credentials are stored.
   * (Renamed from the unused V1 `s3_iam_role` placeholder.)
   */
  S3WebIdentityRole = "s3_web_identity_role",
  /**
   * V2 federated GCS access via GCP Workload Identity Federation: the proxy's
   * OIDC token is exchanged at GCP STS for a token that impersonates a service
   * account. Scaffolded — not yet implemented by the proxy/multistore.
   */
  GcpWorkloadIdentity = "gcp_workload_identity",
  /**
   * V2 federated Azure Blob access via Azure Workload Identity Federation: the
   * proxy's OIDC token is exchanged at Azure AD for a bearer token. Scaffolded —
   * not yet implemented by the proxy/multistore.
   */
  AzureWorkloadIdentity = "azure_workload_identity",
  AzureSasToken = "az_sas_token",
  S3ECSTaskRole = "s3_ecs_task_role",
  S3Local = "s3_local",
}

export const S3LocalAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.S3Local),
  })
  .openapi("S3LocalAuthentication");

export const S3ECSTaskRoleAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.S3ECSTaskRole),
  })
  .openapi("S3ECSTaskRoleAuthentication");

export const S3AccessKeyAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.S3AccessKey),
    access_key_id: z.string().min(1, "Access Key ID is required"),
    secret_access_key: z.string().min(1, "Secret Access Key is required"),
  })
  .openapi("S3AccessKeyAuthentication");

export const AzureSasTokenAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.AzureSasToken),
    sas_token: z.string().min(1, "SAS Token is required"),
  })
  .openapi("AzureSasTokenAuthentication");

/**
 * IAM role ARN: `arn:{partition}:iam::{account}:role/{path}{name}`. The
 * partition class (`aws`, `aws-us-gov`, `aws-cn`) and an optional role path are
 * allowed so GovCloud/China and pathed roles are not rejected.
 */
const IAM_ROLE_ARN_REGEX = /^arn:aws[a-z-]*:iam::\d{12}:role\/.+$/;

/**
 * V2 federated S3 access. `role_arn` is the customer-owned IAM role the proxy
 * assumes via `AssumeRoleWithWebIdentity`. It is *not* a secret (it's an ARN),
 * so it can be surfaced to the proxy without exposing credentials.
 */
export const S3WebIdentityRoleAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.S3WebIdentityRole),
    role_arn: z.string().regex(IAM_ROLE_ARN_REGEX, "Invalid IAM role ARN"),
  })
  .openapi("S3WebIdentityRoleAuthentication");

/**
 * V2 federated GCS access via GCP Workload Identity Federation. The proxy
 * exchanges its OIDC assertion at GCP STS — the `workload_identity_provider`
 * resource is itself the exchange audience — for a token that impersonates
 * `service_account`. Neither field is a secret. Scaffolded — not yet wired in
 * the proxy/multistore.
 */
export const GcpWorkloadIdentityAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.GcpWorkloadIdentity),
    /** Full WIF provider resource: `//iam.googleapis.com/projects/.../providers/...`. */
    workload_identity_provider: z
      .string()
      .startsWith("//iam.googleapis.com/projects/"),
    /** Service account email the exchanged token impersonates for GCS. */
    service_account: z.string().email().endsWith(".gserviceaccount.com"),
  })
  .openapi("GcpWorkloadIdentityAuthentication");

/**
 * V2 federated Azure Blob access via Azure Workload Identity Federation. The
 * proxy exchanges its OIDC assertion at Azure AD (audience
 * `api://AzureADTokenExchange`, a constant) for a bearer token, using the app
 * registration identified by `tenant_id` + `client_id`. Neither field is a
 * secret. Scaffolded — not yet wired in the proxy/multistore.
 */
export const AzureWorkloadIdentityAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.AzureWorkloadIdentity),
    /** Azure AD tenant (directory) ID. */
    tenant_id: z.string().uuid(),
    /** App registration (client) ID holding the federated identity credential. */
    client_id: z.string().uuid(),
  })
  .openapi("AzureWorkloadIdentityAuthentication");

export const DataConnectionAuthenticationSchema = z
  .discriminatedUnion("type", [
    S3AccessKeyAuthenticationSchema,
    S3WebIdentityRoleAuthenticationSchema,
    GcpWorkloadIdentityAuthenticationSchema,
    AzureWorkloadIdentityAuthenticationSchema,
    AzureSasTokenAuthenticationSchema,
    S3ECSTaskRoleAuthenticationSchema,
    S3LocalAuthenticationSchema,
  ])
  .openapi("DataConnectionAuthentication");

export type DataConnectionAuthentication = z.infer<
  typeof DataConnectionAuthenticationSchema
>;

export const S3DataConnectionSchema = z
  .object({
    provider: z.literal(DataProvider.S3),
    bucket: z.string(),
    base_prefix: z.string(),
    region: z.nativeEnum(S3Regions),
    /**
     * Custom S3-compatible endpoint for non-AWS backends (Cloudflare R2, MinIO,
     * Ceph). Omit for AWS S3, which derives its endpoint from `region`.
     */
    endpoint: z.optional(z.string().url()),
  })
  .openapi("S3DataConnection");

export const AzureDataConnectionSchema = z
  .object({
    provider: z.literal(DataProvider.Azure),
    account_name: z.string(),
    container_name: z.string(),
    base_prefix: z.string(),
    region: z.nativeEnum(AzureRegions),
  })
  .openapi("AzureDataConnection");

/**
 * Google Cloud Storage. Access is keyless via GCP Workload Identity Federation
 * (the `gcp_workload_identity` authentication variant), so no region/endpoint is
 * needed to address the bucket.
 */
export const GcpDataConnectionSchema = z
  .object({
    provider: z.literal(DataProvider.GCP),
    bucket: z.string(),
    base_prefix: z.string(),
  })
  .openapi("GcpDataConnection");

export type S3DataConnection = z.infer<typeof S3DataConnectionSchema>;
export type AzureDataConnection = z.infer<typeof AzureDataConnectionSchema>;
export type GcpDataConnection = z.infer<typeof GcpDataConnectionSchema>;

export const DataConnnectionDetailsSchema = z
  .discriminatedUnion("provider", [
    S3DataConnectionSchema,
    AzureDataConnectionSchema,
    GcpDataConnectionSchema,
  ])
  .openapi("DataConnectionDetails");

export type DataConnectionDetails = z.infer<
  typeof DataConnnectionDetailsSchema
>;

export const DataConnectionSchema = z
  .object({
    data_connection_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid data connection ID format")
      .openapi({ example: "data-connection-id" }),
    name: z.string(),
    prefix_template: z.optional(z.string()),
    read_only: z.boolean(),
    // Optional account that owns this connection. Source-Coop-managed
    // connections have no owner and are available to all accounts.
    owner: z.optional(z.string()),
    // Visibilities a product may use on this connection; enforced at product
    // creation (see createProduct in src/lib/actions/products.ts).
    allowed_visibilities: z.array(z.nativeEnum(ProductVisibility)),
    required_flag: z.optional(z.nativeEnum(AccountFlags)),
    /**
     * Account (individual or organization) that owns this connection. Governs
     * who may view its *secret-less* config when it isn't public: absent =
     * unowned (e.g. Source Cooperative-managed) ⇒ viewable by anyone; set ⇒
     * viewable by members of that account. (See `canViewDataConnectionConfig`.)
     */
    owner: z.optional(
      z
        .string()
        .min(MIN_ID_LENGTH)
        .max(MAX_ID_LENGTH)
        .regex(ID_REGEX, "Invalid account ID format")
    ),
    details: DataConnnectionDetailsSchema,
    authentication: z.optional(DataConnectionAuthenticationSchema),
  })
  .openapi("DataConnection");

export type DataConnection = z.infer<typeof DataConnectionSchema>;

/**
 * Whether an authentication variant carries a usable secret — and so must never
 * be exposed outside the `ViewDataConnectionCredentials` (admin) path. The V2
 * federation variants (web identity / workload identity) are secret-less; only
 * the static-credential variants carry secrets.
 */
export function isSecretBearingAuth(
  auth: DataConnectionAuthentication
): boolean {
  // Default-deny on exposure: a type is treated as secret-bearing (kept out of
  // non-admin responses) unless it is explicitly listed below as secret-less.
  // So a newly-added or unknown variant fails safe — never accidentally exposed;
  // exposing a type requires a deliberate edit to this allowlist.
  switch (auth.type) {
    case DataConnectionAuthenticationType.S3WebIdentityRole:
    case DataConnectionAuthenticationType.GcpWorkloadIdentity:
    case DataConnectionAuthenticationType.AzureWorkloadIdentity:
    case DataConnectionAuthenticationType.S3ECSTaskRole:
    case DataConnectionAuthenticationType.S3Local:
      return false;
    default:
      return true;
  }
}
