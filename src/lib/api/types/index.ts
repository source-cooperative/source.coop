import { z } from "zod";

export type Repository = {
  account_id: string;
  repository_id: string;
  mode: RepositoryMode;
  data_mode: RepositoryDataMode;
  featured: Number;
  meta: RepositoryMeta;
  data: RepositoryData;
  disabled: boolean;
};

export type RepositoryData = {
  cdn: string;
  primary_mirror: string;
  mirrors: Map<string, RepositoryMirror>;
};

export type RepositoryMirror = {
  name: string;
  provider: RepositoryDataProvider;
  uri: string;
  region: string;
  delimiter: string;
};

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

export enum RepositoryDataProvider {
  S3 = "s3",
  AZURE = "az",
  GCP = "gcp",
}

export const RepositoryDataProviderSchema = z.nativeEnum(
  RepositoryDataProvider
);

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

export type Account = {
  account_id: string;
  account_type: AccountType;
  identity_id?: string;
  email?: string;
  disabled: boolean;
  profile: AccountProfile;
  flags: AccountFlags[];
};

export const AccountProfileSchema = z.object({
  name: z.optional(z.string()),
  bio: z.optional(z.string()),
  location: z.optional(z.string()),
  url: z.optional(z.string()),
});

export type AccountProfile = z.infer<typeof AccountProfileSchema>;

export type ErrorResponse = {
  code: number;
  message: string | object;
};

export type UserSession = {
  identity_id?: string;
  account?: Account;
  memberships?: Membership[];
};

export enum MembershipRole {
  OWNERS = "owners",
  MAINTAINERS = "maintainers",
  READ_DATA = "read_data",
  WRITE_DATA = "write_data",
}

export enum MembershipState {
  INVITED = "invited",
  REQUESTED = "requested",
  REVOKED = "revoked",
  MEMBER = "member",
}

export type Membership = {
  account_id: string;
  membership_account_id: string;
  repository_id?: string;
  role: MembershipRole;
  state: MembershipState;
  state_changed: string;
};

export type APIKey = {
  access_key_id: string;
  account_id: string;
  disabled: boolean;
  expires: string;
  name: string;
  secret_access_key: string;
};

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

  GET_ACCOUNT_FLAGS = "account:flags:get",
  PUT_ACCOUNT_FLAGS = "account:flags:put",

  GET_ACCOUNT_PROFILE = "account:profile:get",
  PUT_ACCOUNT_PROFILE = "account:profile:put",
}
