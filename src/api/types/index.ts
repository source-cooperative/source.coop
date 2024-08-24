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
 *
 * The module uses Zod for runtime type checking and validation of these structures.
 *
 * @module api/types
 * @requires zod
 *
 * @example
 * import { Repository, Account, Membership, Actions } from '@/api/types';
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
 */

import { z } from "zod";

export const ID_REGEX = /^(?=.{4,40}$)[a-z0-9](?:(?!--)[a-z0-9-])*[a-z0-9]$/;

export enum RepositoryDataProvider {
  S3 = "s3",
  Azure = "az",
  GCP = "gcp",
}

export const RepositoryMirrorSchema = z.discriminatedUnion("provider", [
  z.object({
    name: z.string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
    }),
    provider: z.literal(RepositoryDataProvider.S3),
    uri: z.string().url("Invalid URI format"),
    region: z.string({
      required_error: "Region is required",
      invalid_type_error: "Region must be a string",
    }),
    delimiter: z.string({
      required_error: "Delimiter is required",
      invalid_type_error: "Delimiter must be a string",
    }),
  }),
  z.object({
    name: z.string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
    }),
    provider: z.literal(RepositoryDataProvider.Azure),
    uri: z.string().url("Invalid URI format"),
    region: z.string({
      required_error: "Region is required",
      invalid_type_error: "Region must be a string",
    }),
    delimiter: z.string({
      required_error: "Delimiter is required",
      invalid_type_error: "Delimiter must be a string",
    }),
  }),
]);

export type RepositoryMirror = z.infer<typeof RepositoryMetaSchema>;

export type RepositoryData = {
  cdn: string;
  primary_mirror: string;
  mirrors: Map<string, RepositoryMirror>;
};

export const RepositoryDataSchema = z.object({
  cdn: z.string().url("Invalid CDN URL"),
  primary_mirror: z.string({
    required_error: "Primary mirror is required",
    invalid_type_error: "Primary mirror must be a string",
  }),
  mirrors: z.record(RepositoryMirrorSchema),
});

export const RepositoryMetaSchema = z.object({
  title: z.string({
    required_error: "Title is required",
    invalid_type_error: "Title must be a string",
  }),
  description: z.string({
    required_error: "Description is required",
    invalid_type_error: "Description must be a string",
  }),
  tags: z.array(
    z.string({
      required_error: "Tag is required",
      invalid_type_error: "Tag must be a string",
    })
  ),
  published: z.string().datetime("Invalid date format"),
});

export type RepositoryMeta = z.infer<typeof RepositoryMetaSchema>;

export type RepositoryListResponse = {
  repositories: Repository[];
  next?: string;
  count: Number;
};

export enum RepositoryMode {
  Listed = "listed",
  Unlisted = "unlisted",
  Private = "private",
}

export const RepositoryModeSchema = z.nativeEnum(RepositoryMode, {
  errorMap: () => ({ message: "Invalid repository mode" }),
});

export enum RepositoryDataMode {
  Open = "open",
  Private = "private",
}

export const RepositoryDataModeSchema = z.nativeEnum(RepositoryDataMode, {
  errorMap: () => ({ message: "Invalid repository data mode" }),
});

export const RepositoryDataProviderSchema = z.nativeEnum(
  RepositoryDataProvider,
  {
    errorMap: () => ({ message: "Invalid repository data provider" }),
  }
);

export enum RepositoryFeatured {
  Featured = 1,
  NotFeatured = 0,
}

export const RepositorySchema = z.object({
  account_id: z.string().regex(ID_REGEX, "Invalid account ID format"),
  repository_id: z.string().regex(ID_REGEX, "Invalid repository ID format"),
  mode: RepositoryModeSchema,
  data_mode: RepositoryDataModeSchema,
  featured: z.nativeEnum(RepositoryFeatured, {
    errorMap: () => ({ message: "Invalid featured value" }),
  }),
  meta: RepositoryMetaSchema,
  data: RepositoryDataSchema,
  disabled: z.boolean(),
});

export type Repository = z.infer<typeof RepositorySchema>;

export enum AccountType {
  USER = "user",
  ORGANIZATION = "organization",
  SERVICE = "service",
}

export const AccountTypeSchema = z.nativeEnum(AccountType, {
  errorMap: () => ({ message: "Invalid account type" }),
});

export enum AccountFlags {
  ADMIN = "admin",
  CREATE_REPOSITORIES = "create_repositories",
  CREATE_ORGANIZATIONS = "create_organizations",
}

export const AccountFlagsSchema = z.array(
  z.nativeEnum(AccountFlags, {
    errorMap: () => ({ message: "Invalid account flag" }),
  })
);

export const AccountProfileSchema = z.object({
  name: z
    .string({
      required_error: "Name is required",
      invalid_type_error: "Name must be a string",
    })
    .min(1, "Name must not be empty")
    .max(50, "Name must not exceed 50 characters"),
  bio: z.optional(z.string()),
  location: z.optional(z.string()),
  url: z.optional(z.string().url("Invalid URL format")),
});

export type AccountProfile = z.infer<typeof AccountProfileSchema>;

export type AccountProfileResponse = {
  name?: string;
  bio?: string;
  location?: string;
  url?: string;
  profile_image: string;
};

export const AccountSchema = z.object({
  account_id: z.string().regex(ID_REGEX, "Invalid account ID format"),
  account_type: AccountTypeSchema,
  identity_id: z.optional(z.string()),
  email: z.optional(z.string().email("Invalid email format")),
  disabled: z.boolean(),
  profile: AccountProfileSchema,
  flags: AccountFlagsSchema,
});

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

export const MembershipRoleSchema = z.nativeEnum(MembershipRole, {
  errorMap: () => ({ message: "Invalid membership role" }),
});

export enum MembershipState {
  Invited = "invited",
  Revoked = "revoked",
  Member = "member",
}

export const MembershipStateSchema = z.nativeEnum(MembershipState, {
  errorMap: () => ({ message: "Invalid membership state" }),
});

export const MembershipSchema = z.object({
  account_id: z.string().regex(ID_REGEX, "Invalid account ID format"),
  membership_account_id: z
    .string()
    .regex(ID_REGEX, "Invalid membership account ID format"),
  repository_id: z.optional(
    z.string().regex(ID_REGEX, "Invalid repository ID format")
  ),
  role: MembershipRoleSchema,
  state: MembershipStateSchema,
  state_changed: z.string().datetime("Invalid date format for state changed"),
});

export type Membership = z.infer<typeof MembershipSchema>;

export const APIKeySchema = z.object({
  access_key_id: z.string({
    required_error: "Access key ID is required",
    invalid_type_error: "Access key ID must be a string",
  }),
  account_id: z.string().regex(ID_REGEX, "Invalid account ID format"),
  disabled: z.boolean(),
  expires: z.string().datetime("Invalid expiration date format"), // TODO: change to datetime
  name: z.string({
    required_error: "API key name is required",
    invalid_type_error: "API key name must be a string",
  }), // TODO: Add regex for name
  secret_access_key: z.string({
    required_error: "Secret access key is required",
    invalid_type_error: "Secret access key must be a string",
  }),
});

export type APIKey = z.infer<typeof APIKeySchema>;

export const APIKeyRequestSchema = z.object({
  name: z.string({
    required_error: "API key name is required",
    invalid_type_error: "API key name must be a string",
  }),
  expires: z.string().datetime("Invalid expiration date format"),
});

export type APIKeyRequest = z.infer<typeof APIKeyRequestSchema>;

export const UserSessionSchema = z.object({
  identity_id: z.optional(z.string()),
  account: z.optional(AccountSchema),
  memberships: z.optional(z.array(MembershipSchema)),
});

export type UserSession = z.infer<typeof UserSessionSchema>;

export enum Actions {
  CreateRepository = "repository:create",
  PutRepository = "repository:put",
  DisableRepository = "repository:disable",
  ListRepository = "repository:list",
  GetRepository = "repository:get",

  ReadRepositoryData = "repository:data:read",
  WriteRepositoryData = "repository:data:write",

  CreateAccount = "account:create",
  DisableAccount = "account:disable",
  GetAccount = "account:get",
  ListAccount = "account:list",
  ListAccountAPIKeys = "account:listAPIKeys",

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
}
