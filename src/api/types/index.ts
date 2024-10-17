/**
 * @fileoverview Type definitions and schemas for the Source Cooperative API.
 *
 * This module defines the core data structures, enums, and Zod schemas used throughout
 * the Source Cooperative application. It includes definitions for:
 * - Repositories and their associated data
 * - User and organization accounts
 * - Memberships and roles
 * - API keys
 * - User sessions
 * - Action types for authorization
 * - Data connections and providers
 *
 * The module uses Zod for runtime type checking and validation of these structures.
 * It also extends Zod with OpenAPI functionality for API documentation.
 *
 * @module api/types
 * @requires zod
 * @requires @asteasolutions/zod-to-openapi
 *
 * @example
 * import { Repository, Account, Membership, Actions, DataConnection } from '@/api/types';
 *
 * // Use the types in your code
 * const repo: Repository = {
 *   account_id: 'user123',
 *   repository_id: 'repo456',
 *   // ... other properties
 * };
 *
 * // Use the schemas for validation
 * const validRepo = RepositorySchema.parse(someData);
 *
 * // Use OpenAPI extended schemas
 * const openApiSpec = generateOpenApiDocumentation(RepositorySchema);
 */
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const MIN_ID_LENGTH = 3;
export const MAX_ID_LENGTH = 40;

export const ID_REGEX = /^[a-z0-9](?:(?!--)[a-z0-9-])*[a-z0-9]$/;

export enum DataProvider {
  S3 = "s3",
  Azure = "az",
  GCP = "gcp",
}

export enum S3Regions {
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

export const RepositoryMirrorSchema = z
  .object({
    data_connection_id: z.string(),
    prefix: z.string(),
  })
  .openapi("RepositoryMirror");

export type RepositoryMirror = z.infer<typeof RepositoryMetaSchema>;

export const RepositoryDataSchema = z
  .object({
    primary_mirror: z.string({
      required_error: "Primary mirror is required",
      invalid_type_error: "Primary mirror must be a string",
    }),
    mirrors: z.record(RepositoryMirrorSchema),
  })
  .openapi("RepositoryData");

export const RepositoryMetaSchema = z
  .object({
    title: z.preprocess(
      (title) => {
        if (!title || typeof title !== "string") return undefined;
        return title === "" ? undefined : title;
      },
      z.string({
        required_error: "Title is required",
        invalid_type_error: "Title must be a string",
      })
    ),
    description: z.preprocess(
      (description) => {
        if (!description || typeof description !== "string") return undefined;
        return description === "" ? undefined : description;
      },
      z.string({
        required_error: "Description is required",
        invalid_type_error: "Description must be a string",
      })
    ),
    tags: z
      .string()
      .transform((value) => value.split(","))
      .pipe(z.string().trim().array()),
  })
  .openapi("RepositoryMeta");

export type RepositoryMeta = z.infer<typeof RepositoryMetaSchema>;

export type RepositoryListResponse = {
  repositories: Repository[];
  next?: string;
  count: Number;
};

export enum RepositoryState {
  Listed = "listed",
  Unlisted = "unlisted",
}

export enum RepositoryPermissions {
  Write = "write",
  Read = "read",
}

export const RepositoryStateSchema = z
  .nativeEnum(RepositoryState, {
    errorMap: () => ({ message: "Invalid repository mode" }),
  })
  .openapi("RepositoryState");

export enum RepositoryDataMode {
  Open = "open",
  Subscription = "subscription",
  Private = "private",
}

export const RepositoryDataModeSchema = z
  .nativeEnum(RepositoryDataMode, {
    errorMap: () => ({ message: "Invalid repository data mode" }),
  })
  .openapi("RepositoryDataMode");

export enum RepositoryFeatured {
  Featured = 1,
  NotFeatured = 0,
}

export const RepositorySchema = z
  .object({
    account_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid account ID format"),
    repository_id: z
      .string({
        required_error: "Repository ID is required",
        invalid_type_error: "Repository ID must be a string",
      })
      .min(MIN_ID_LENGTH, "Repository ID must be at least 3 characters long")
      .max(MAX_ID_LENGTH, "Repository ID may not be longer than 40 characters")
      .toLowerCase()
      .regex(ID_REGEX, "Invalid repository ID format"),
    state: RepositoryStateSchema,
    data_mode: RepositoryDataModeSchema,
    featured: z.nativeEnum(RepositoryFeatured, {
      errorMap: () => ({ message: "Invalid featured value" }),
    }),
    meta: RepositoryMetaSchema,
    data: RepositoryDataSchema,
    published: z.string().datetime({ offset: true }),
    disabled: z.boolean(),
  })
  .openapi("Repository");

export enum DataConnectionAuthenticationType {
  S3AccessKey = "s3_access_key",
  S3IAMRole = "s3_iam_role",
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
    access_key_id: z.string(),
    secret_access_key: z.string(),
  })
  .openapi("S3AccessKeyAuthentication");

export const AzureSasTokenAuthenticationSchema = z
  .object({
    type: z.literal(DataConnectionAuthenticationType.AzureSasToken),
    sas_token: z.string(),
  })
  .openapi("AzureSasTokenAuthentication");

export const DataConnectionAuthenticationSchema = z
  .discriminatedUnion("type", [
    S3AccessKeyAuthenticationSchema,
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

export type S3DataConnection = z.infer<typeof S3DataConnectionSchema>;
export type AzureDataConnection = z.infer<typeof AzureDataConnectionSchema>;

export const DataConnnectionDetailsSchema = z
  .discriminatedUnion("provider", [
    S3DataConnectionSchema,
    AzureDataConnectionSchema,
  ])
  .openapi("DataConnectionDetails");

export type DataConnectionDetails = z.infer<
  typeof DataConnnectionDetailsSchema
>;

export enum AccountFlags {
  ADMIN = "admin",
  CREATE_REPOSITORIES = "create_repositories",
  CREATE_ORGANIZATIONS = "create_organizations",
}

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
    allowed_data_modes: z.array(z.nativeEnum(RepositoryDataMode)),
    required_flag: z.optional(z.nativeEnum(AccountFlags)),
    details: DataConnnectionDetailsSchema,
    authentication: z.optional(DataConnectionAuthenticationSchema),
  })
  .openapi("DataConnection");

export type DataConnection = z.infer<typeof DataConnectionSchema>;

export type Repository = z.infer<typeof RepositorySchema>;

export enum AccountType {
  USER = "user",
  ORGANIZATION = "organization",
  SERVICE = "service",
}

export const AccountTypeSchema = z
  .nativeEnum(AccountType, {
    errorMap: () => ({ message: "Invalid account type" }),
  })
  .openapi("AccountType");

export const AccountFlagsSchema = z
  .array(
    z.nativeEnum(AccountFlags, {
      errorMap: () => ({ message: "Invalid account flag" }),
    })
  )
  .openapi("AccountFlags");

export const AccountProfileSchema = z
  .object({
    name: z
      .preprocess((name) => {
        if (!name || typeof name !== "string") return undefined;
        return name === "" ? undefined : name;
      }, z.optional(z.string().max(128, "Name must not exceed 128 characters")))
      .openapi({ example: "Isaac Asimov" }),
    bio: z
      .preprocess((bio) => {
        if (!bio || typeof bio !== "string") return undefined;
        return bio === "" ? undefined : bio;
      }, z.optional(z.string().max(1024, "Bio must not exceed 1024 characters")))
      .openapi({ example: "Software Engineer @radiantearth" }),
    location: z
      .preprocess((location) => {
        if (!location || typeof location !== "string") return undefined;
        return location === "" ? undefined : location;
      }, z.optional(z.string().max(128, "Location must not exceed 128 characters")))
      .openapi({ example: "Augsburg, Germany" }),
    url: z
      .preprocess((url) => {
        if (!url || typeof url !== "string") return undefined;
        return url === "" ? undefined : url;
      }, z.optional(z.string().url()))
      .openapi({ example: "https://source.coop" }),
  })
  .openapi("AccountProfile");

export type AccountProfile = z.infer<typeof AccountProfileSchema>;

export const AccountProfileResponseSchema = AccountProfileSchema.extend({
  profile_image: z.optional(z.string()),
  account_type: z.optional(z.nativeEnum(AccountType)),
}).openapi("AccountProfileResponse");

export type AccountProfileResponse = z.infer<
  typeof AccountProfileResponseSchema
>;

export const AccountSchema = z
  .object({
    account_id: z
      .string()
      .min(
        MIN_ID_LENGTH,
        `Account ID must be at least ${MIN_ID_LENGTH} characters`
      )
      .max(
        MAX_ID_LENGTH,
        `Account ID must not exceed ${MAX_ID_LENGTH} characters`
      )
      .toLowerCase()
      .regex(
        ID_REGEX,
        "Account ID may not begin or end with a hyphen OR contain consecutive hyphens"
      )
      .openapi({ example: "account-id" }),
    account_type: AccountTypeSchema,
    identity_id: z.optional(z.string()).openapi({ example: "identity-id" }),
    disabled: z.boolean(),
    profile: AccountProfileSchema,
    flags: AccountFlagsSchema,
  })
  .openapi("Account");

export type Account = z.infer<typeof AccountSchema>;

export type ErrorResponse = {
  code: number;
  message: string | object;
  errors?: any;
};

export enum MembershipRole {
  Owners = "owners",
  Maintainers = "maintainers",
  ReadData = "read_data",
  WriteData = "write_data",
}

export const MembershipRoleSchema = z
  .nativeEnum(MembershipRole, {
    errorMap: () => ({ message: "Invalid membership role" }),
  })
  .openapi("MembershipRole");

export const RepositoryPermissionsResponseSchema = z.array(
  z.nativeEnum(RepositoryPermissions)
);
export type RepositoryPermissionsResponse = z.infer<
  typeof RepositoryPermissionsResponseSchema
>;

export enum MembershipState {
  Invited = "invited",
  Revoked = "revoked",
  Member = "member",
}

export const MembershipStateSchema = z
  .nativeEnum(MembershipState, {
    errorMap: () => ({ message: "Invalid membership state" }),
  })
  .openapi("MembershipState");

export const MembershipSchema = z
  .object({
    membership_id: z
      .string()
      .uuid()
      .openapi({ example: "00000000-0000-0000-0000-000000000000" }),
    account_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid account ID format")
      .openapi({ example: "account-id" }),
    membership_account_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid membership account ID format")
      .openapi({ example: "organization-id" }),
    repository_id: z
      .optional(
        z
          .string()
          .min(MIN_ID_LENGTH)
          .max(MAX_ID_LENGTH)
          .toLowerCase()
          .regex(ID_REGEX, "Invalid repository ID format")
      )
      .openapi({ example: "repository-id" }),
    role: MembershipRoleSchema,
    state: MembershipStateSchema,
    state_changed: z.string().datetime("Invalid date format for state changed"),
  })
  .openapi("Membership");

export type Membership = z.infer<typeof MembershipSchema>;

export const APIKeySchema = z
  .object({
    access_key_id: z
      .string({
        required_error: "Access key ID is required",
        invalid_type_error: "Access key ID must be a string",
      })
      .min(2)
      .max(24)
      .startsWith("SC")
      .toUpperCase()
      .openapi({ example: "SCFOOBAR" }),
    account_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid account ID format")
      .openapi({ example: "account-id" }),
    repository_id: z
      .optional(
        z
          .string()
          .min(MIN_ID_LENGTH)
          .max(MAX_ID_LENGTH)
          .toLowerCase()
          .regex(ID_REGEX, "Invalid repository ID format")
      )
      .openapi({ example: "repository-id" }),
    disabled: z.boolean(),
    expires: z.string().datetime("Invalid expiration date format"),
    name: z
      .string({
        required_error: "API key name is required",
        invalid_type_error: "API key name must be a string",
      })
      .min(1)
      .max(128)
      .openapi({ example: "Dev Machine" }),
    secret_access_key: z
      .string({
        required_error: "Secret access key is required",
        invalid_type_error: "Secret access key must be a string",
      })
      .length(64),
  })
  .openapi("APIKey");

export type APIKey = z.infer<typeof APIKeySchema>;

export const RepositoryListSchema = z
  .object({
    repositories: z.array(RepositorySchema),
    next: z.optional(z.string()),
  })
  .openapi("RepositoryListResponse");

export type RepositoryList = z.infer<typeof RepositoryListSchema>;

export const APIKeyRequestSchema = z
  .object({
    name: z
      .preprocess(
        (name) => {
          if (!name || typeof name !== "string") return undefined;
          return name === "" ? undefined : name;
        },
        z.string({
          required_error: "API key name is required",
          invalid_type_error: "API key name must be a string",
        })
      )
      .openapi({ example: "Dev Machine" }),
    expires: z.string().datetime("Invalid expiration date format"),
  })
  .openapi("APIKeyRequest");

export type APIKeyRequest = z.infer<typeof APIKeyRequestSchema>;

export const UserSessionSchema = z
  .object({
    identity_id: z.optional(z.string()).openapi({ example: "identity-id" }),
    account: z.optional(AccountSchema),
    memberships: z.optional(z.array(MembershipSchema)),
  })
  .openapi("UserSession");

export type UserSession = z.infer<typeof UserSessionSchema>;

export const AccountCreationRequestSchema = AccountSchema.pick({
  account_id: true,
  account_type: true,
  profile: true,
}).openapi("AccountCreationRequest");
export type AccountCreationRequest = z.infer<
  typeof AccountCreationRequestSchema
>;

export const RepositoryCreationRequestSchema = RepositorySchema.pick({
  repository_id: true,
  data_mode: true,
  meta: true,
})
  .extend({
    data_connection_id: z
      .string()
      .min(MIN_ID_LENGTH)
      .max(MAX_ID_LENGTH)
      .toLowerCase()
      .regex(ID_REGEX, "Invalid data connection ID format")
      .openapi({ example: "data-connection-id" }),
  })
  .openapi("RepositoryCreationRequest");

export type RepositoryCreationRequest = z.infer<
  typeof RepositoryCreationRequestSchema
>;

export const RepositoryUpdateRequestSchema = RepositorySchema.pick({
  meta: true,
  state: true,
}).openapi("RepositoryUpdateRequest");

export type RepositoryUpdateRequest = z.infer<
  typeof RepositoryUpdateRequestSchema
>;

export const RepositoryFeaturedUpdateRequestSchema = RepositorySchema.pick({
  featured: true,
}).openapi("RepositoryFeaturedUpdateRequest");

export type RepositoryFeaturedUpdateRequest = z.infer<
  typeof RepositoryFeaturedUpdateRequestSchema
>;

export const MembershipInvitationSchema = MembershipSchema.pick({
  account_id: true,
  role: true,
}).openapi("MembershipInvitation");

export type MembershipInvitation = z.infer<typeof MembershipInvitationSchema>;

export const RedactedAPIKeySchema = APIKeySchema.omit({
  secret_access_key: true,
}).openapi("RedactedAPIKey");

export type RedactedAPIKey = z.infer<typeof RedactedAPIKeySchema>;

export enum Actions {
  CreateRepository = "repository:create",
  PutRepository = "repository:put",
  DisableRepository = "repository:disable",
  ListRepository = "repository:list",
  GetRepository = "repository:get",
  ListRepositoryAPIKeys = "repository:listAPIKeys",
  ListRepositoryMemberships = "repository:listMemberships",

  ReadRepositoryData = "repository:data:read",
  WriteRepositoryData = "repository:data:write",

  CreateAccount = "account:create",
  DisableAccount = "account:disable",
  GetAccount = "account:get",
  ListAccount = "account:list",
  ListAccountAPIKeys = "account:listAPIKeys",
  ListAccountMemberships = "account:listMemberships",

  GetAccountFlags = "account:flags:get",
  PutAccountFlags = "account:flags:put",

  GetAccountProfile = "account:profile:get",
  PutAccountProfile = "account:profile:put",

  GetAPIKey = "api_key:get",
  CreateAPIKey = "api_key:create",
  RevokeAPIKey = "api_key:revoke",

  GetMembership = "membership:get",
  AcceptMembership = "membership:accept",
  RejectMembership = "membership:reject",
  RevokeMembership = "membership:revoke",
  InviteMembership = "membership:invite",

  GetDataConnection = "data_connection:get",
  CreateDataConnection = "data_connection:create",
  DisableDataConnection = "data_connection:disable",
  UseDataConnection = "data_connection:use",
  ViewDataConnectionCredentials = "data_connection:credentials:view",
  PutDataConnection = "data_connection:put",
}
