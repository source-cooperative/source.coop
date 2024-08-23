import { z } from "zod";

export const ID_REGEX = /^(?=.{4,40}$)[a-z0-9](?:(?!--)[a-z0-9-])*[a-z0-9]$/;

export enum RepositoryDataProvider {
  S3 = "s3",
  AZURE = "az",
  GCP = "gcp",
}

export const RepositoryMirrorSchema = z.discriminatedUnion("provider", [
  z.object({
    name: z.string(),
    provider: z.literal(RepositoryDataProvider.S3),
    uri: z.string(),
    region: z.string(),
    delimiter: z.string(),
  }),
  z.object({
    name: z.string(),
    provider: z.literal(RepositoryDataProvider.AZURE),
    uri: z.string(),
    region: z.string(),
    delimiter: z.string(),
  }),
]);

export type RepositoryMirror = z.infer<typeof RepositoryMetaSchema>;

export type RepositoryData = {
  cdn: string;
  primary_mirror: string;
  mirrors: Map<string, RepositoryMirror>;
};

export const RepositoryDataSchema = z.object({
  cdn: z.string(),
  primary_mirror: z.string(),
  mirrors: z.record(RepositoryMirrorSchema),
});

export const RepositoryMetaSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  published: z.string(),
});

export type RepositoryMeta = z.infer<typeof RepositoryMetaSchema>;

export type RepositoryListResponse = {
  repositories: Repository[];
  next?: string;
  count: Number;
};

export enum RepositoryMode {
  LISTED = "listed",
  UNLISTED = "unlisted",
  PRIVATE = "private",
}

export const RepositoryModeSchema = z.nativeEnum(RepositoryMode);

export enum RepositoryDataMode {
  OPEN = "open",
  PRIVATE = "private",
}

export const RepositoryDataModeSchema = z.nativeEnum(RepositoryDataMode);

export const RepositoryDataProviderSchema = z.nativeEnum(
  RepositoryDataProvider
);

export enum RepositoryFeatured {
  FEATURED = 1,
  NOT_FEATURED = 0,
}

export const RepositorySchema = z.object({
  account_id: z.string().regex(ID_REGEX),
  repository_id: z.string().regex(ID_REGEX),
  mode: RepositoryModeSchema,
  data_mode: RepositoryDataModeSchema,
  featured: z.nativeEnum(RepositoryFeatured),
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

export const AccountTypeSchema = z.nativeEnum(AccountType);

export enum AccountFlags {
  ADMIN = "admin",
  CREATE_REPOSITORIES = "create_repositories",
  CREATE_ORGANIZATIONS = "create_organizations",
}

export const AccountFlagsSchema = z.array(z.nativeEnum(AccountFlags));

export const AccountProfileSchema = z.object({
  name: z.optional(z.string().min(1).max(50)),
  bio: z.optional(z.string()),
  location: z.optional(z.string()),
  url: z.optional(z.string().url()),
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
  account_id: z.string().regex(ID_REGEX),
  account_type: AccountTypeSchema,
  identity_id: z.optional(z.string()),
  email: z.optional(z.string().email()),
  disabled: z.boolean(),
  profile: AccountProfileSchema,
  flags: AccountFlagsSchema,
});

export type Account = z.infer<typeof AccountSchema>;

export type ErrorResponse = {
  code: number;
  message: string | object;
};

export enum MembershipRole {
  OWNERS = "owners",
  MAINTAINERS = "maintainers",
  READ_DATA = "read_data",
  WRITE_DATA = "write_data",
}

export const MembershipRoleSchema = z.nativeEnum(MembershipRole);

export enum MembershipState {
  INVITED = "invited",
  REVOKED = "revoked",
  MEMBER = "member",
}

export const MembershipStateSchema = z.nativeEnum(MembershipState);

export const MembershipSchema = z.object({
  account_id: z.string().regex(ID_REGEX),
  membership_account_id: z.string().regex(ID_REGEX),
  repository_id: z.optional(z.string().regex(ID_REGEX)),
  role: MembershipRoleSchema,
  state: MembershipStateSchema,
  state_changed: z.string(),
});

export type Membership = z.infer<typeof MembershipSchema>;

export const APIKeySchema = z.object({
  access_key_id: z.string(),
  account_id: z.string().regex(ID_REGEX),
  disabled: z.boolean(),
  expires: z.string(), // TODO: change to datetime
  name: z.string(), // TODO: Add regex for name
  secret_access_key: z.string(),
});

export type APIKey = z.infer<typeof APIKeySchema>;

export const APIKeyRequestSchema = z.object({
  name: z.string(),
  expires: z.string(),
});

export type APIKeyRequest = z.infer<typeof APIKeyRequestSchema>;

export const UserSessionSchema = z.object({
  identity_id: z.optional(z.string()),
  account: z.optional(AccountSchema),
  memberships: z.optional(z.array(MembershipSchema)),
});

export type UserSession = z.infer<typeof UserSessionSchema>;

export enum Actions {
  CREATE_REPOSITORY = "repository:create",
  PUT_REPOSITORY = "repository:put",
  DISABLE_REPOSITORY = "repository:disable",
  LIST_REPOSITORY = "repository:list",
  GET_REPOSITORY = "repository:get",

  READ_REPOSITORY_DATA = "repository:data:read",
  WRITE_REPOSITORY_DATA = "repository:data:write",

  CREATE_ACCOUNT = "account:create",
  DISABLE_ACCOUNT = "account:disable",
  GET_ACCOUNT = "account:get",
  LIST_ACCOUNT = "account:list",
  LIST_ACCOUNT_API_KEYS = "account:listAPIKeys",

  GET_ACCOUNT_FLAGS = "account:flags:get",
  PUT_ACCOUNT_FLAGS = "account:flags:put",

  GET_ACCOUNT_PROFILE = "account:profile:get",
  PUT_ACCOUNT_PROFILE = "account:profile:put",

  GET_API_KEY = "api_key:get",
  CREATE_API_KEY = "api_key:create",
  REVOKE_API_KEY = "api_key:revoke",

  // TODO: Create the authz check functions for these actions
  GET_MEMBERSHIP = "membership:get",
  ACCEPT_MEMBERSHIP = "membership:accept",
  REJECT_MEMBERSHIP = "membership:reject",
  REVOKE_MEMBERSHIP = "membership:revoke",
  INVITE_MEMBERSHIP = "membership:invite",
}
