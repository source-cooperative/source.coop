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

export type RepositoryMeta = {
  title: string;
  description: string;
  tags: string[];
  published: string;
};

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

export enum RepositoryDataMode {
  OPEN = "open",
  PRIVATE = "private",
}

export enum RepositoryDataProvider {
  S3 = "s3",
  AZURE = "az",
  GCP = "gcp",
}

export enum AccountType {
  USER = "user",
  ORGANIZATION = "organization",
}

export type UserAccount = {
  account_id: string;
  account_type: AccountType.USER;
  identity_id: string;
  disabled: boolean;
};

export type OrganizationAccount = {
  account_id: string;
  account_type: AccountType.ORGANIZATION;
  name: string;
  description?: string;
  url?: string;
  disabled: boolean;
};

export type ErrorResponse = {
  code: number;
  message: string;
};

export type UserSession = {
  identity_id: string;
  flags: string[];
  account?: UserAccount;
  profile: UserProfile;
};

export type UserProfile = {
  bio: string;
  country: string;
  email: string;
  name: UserName;
};

export type UserName = {
  first_name: string;
  last_name: string;
};
