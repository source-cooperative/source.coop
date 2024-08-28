import {
  Account,
  Repository,
  Actions,
  UserSession,
  AccountFlags,
  RepositoryState,
  AccountType,
  MembershipState,
  MembershipRole,
  RepositoryDataMode,
  APIKey,
  Membership,
  RepositoryFeatured,
  DataProvider,
} from "@/api/types";

export const mockAdminUser: UserSession = {
  identity_id: "admin_identity_id",
  account: {
    account_id: "admin_id",
    flags: [AccountFlags.ADMIN],
    account_type: AccountType.USER,
    disabled: false,
    profile: {
      name: "Admin User",
    },
    email: "admin@source.coop",
  },
  memberships: [],
};

export const mockOrganizationOwner: UserSession = {
  identity_id: "organization_owner_identity_id",
  account: {
    account_id: "organization_owner_id",
    flags: [AccountFlags.CREATE_REPOSITORIES],
    account_type: AccountType.USER,
    disabled: false,
    profile: {
      name: "Organization Owner User",
    },
    email: "orgowner@source.coop",
  },
  memberships: [
    {
      account_id: "organization_owner_id",
      membership_account_id: "organization_id",
      role: MembershipRole.Owners,
      state: MembershipState.Member,
      state_changed: new Date().toISOString(),
    },
  ],
};

export const mockOrganizationMaintainer: UserSession = {
  identity_id: "organization_maintainer_identity_id",
  account: {
    account_id: "organization_maintainer_id",
    flags: [AccountFlags.CREATE_REPOSITORIES],
    account_type: AccountType.USER,
    disabled: false,
    profile: {
      name: "Organization Maintainer User",
    },
    email: "orgmaintainer@source.coop",
  },
  memberships: [
    {
      account_id: "organization_maintainer_id",
      membership_account_id: "organization_id",
      role: MembershipRole.Maintainers,
      state: MembershipState.Member,
      state_changed: new Date().toISOString(),
    },
  ],
};

export const mockOrganizationReadDataUser: UserSession = {
  identity_id: "organization_read_data_identity_id",
  account: {
    account_id: "organization_read_data_id",
    flags: [],
    account_type: AccountType.USER,
    disabled: false,
    profile: {
      name: "Organization Read Data User",
    },
    email: "orgreaddata@source.coop",
  },
  memberships: [
    {
      account_id: "organization_read_data_id",
      membership_account_id: "organization_id",
      role: MembershipRole.ReadData,
      state: MembershipState.Member,
      state_changed: new Date().toISOString(),
    },
  ],
};

export const mockOrganizationWriteDataUser: UserSession = {
  identity_id: "organization_write_data_identity_id",
  account: {
    account_id: "organization_write_data_id",
    flags: [],
    account_type: AccountType.USER,
    disabled: false,
    profile: {
      name: "Organization Write Data User",
    },
    email: "orgwritedata@source.coop",
  },
  memberships: [
    {
      account_id: "organization_write_data_id",
      membership_account_id: "organization_id",
      role: MembershipRole.WriteData,
      state: MembershipState.Member,
      state_changed: new Date().toISOString(),
    },
  ],
};

export const invitedUser: UserSession = {
  identity_id: "invited_user_identity_id",
  account: {
    account_id: "invited_user_id",
    flags: [],
    account_type: AccountType.USER,
    disabled: false,
    profile: {
      name: "Invited User",
    },
    email: "inviteduser@source.coop",
  },
  memberships: [
    {
      account_id: "invited_user_id",
      membership_account_id: "organization_id",
      role: MembershipRole.Owners,
      state: MembershipState.Invited,
      state_changed: new Date().toISOString(),
    },
  ],
};

export const revokedUser: UserSession = {
  identity_id: "revoked_user_identity_id",
  account: {
    account_id: "revoked_user_id",
    flags: [],
    account_type: AccountType.USER,
    disabled: false,
    profile: {
      name: "Revoked User User",
    },
    email: "revokeduser@source.coop",
  },
  memberships: [
    {
      account_id: "revoked_user_id",
      membership_account_id: "organization_id",
      role: MembershipRole.Owners,
      state: MembershipState.Revoked,
      state_changed: new Date().toISOString(),
    },
  ],
};

export const regularUser: UserSession = {
  identity_id: "regular_user_identity_id",
  account: {
    account_id: "regular_user_id",
    flags: [],
    account_type: AccountType.USER,
    disabled: false,
    profile: {
      name: "Regular User",
    },
    email: "regularuser@source.coop",
  },
  memberships: [],
};

export const regularUserAPIKey: APIKey = {
  access_key_id: "foo",
  secret_access_key: "bar",
  account_id: "regular_user_id",
  disabled: false,
  expires: new Date(99999999999999).toISOString(),
  name: "Regular User API Key",
};

export const disabledAPIKey: APIKey = {
  access_key_id: "foo",
  secret_access_key: "bar",
  account_id: "regular_user_id",
  disabled: true,
  expires: new Date(99999999999999).toISOString(),
  name: "Disabled API Key",
};

export const expiredAPIKey: APIKey = {
  access_key_id: "foo",
  secret_access_key: "bar",
  account_id: "regular_user_id",
  disabled: true,
  expires: new Date(0).toISOString(),
  name: "Disabled API Key",
};

export const createRepositoriesUser: UserSession = {
  identity_id: "create_repository_user_identity_id",
  account: {
    account_id: "create_repository_user_id",
    flags: [AccountFlags.CREATE_REPOSITORIES],
    account_type: AccountType.USER,
    disabled: false,
    profile: {
      name: "Create Repository User",
    },
    email: "createrepository@source.coop",
  },
  memberships: [],
};

export const disabled: UserSession = {
  identity_id: "disabled_user_identity_id",
  account: {
    account_id: "disabled_user_id",
    flags: [AccountFlags.CREATE_REPOSITORIES],
    account_type: AccountType.USER,
    disabled: true,
    profile: {
      name: "Disabled User",
    },
    email: "disableduser@source.coop",
  },
  memberships: [],
};

export const regularOrganization: Account = {
  disabled: false,
  account_id: "org_id",
  account_type: AccountType.ORGANIZATION,
  profile: {
    name: "Regular Organization",
  },
};

export const regularRepository: Repository = {
  account_id: "create_repository_user_id",
  repository_id: "regular_repo_id",
  state: RepositoryState.Listed,
  data_mode: RepositoryDataMode.Open,
  featured: RepositoryFeatured.NotFeatured,
  meta: {
    title: "Regular Repository",
    description: "Repository Description",
    tags: [],
  },
  data: {
    primary_mirror: "s3_data_connection",
    mirrors: {
      s3_data_connection: {
        prefix: "create_repository_user_id/regular_repo_id/",
      },
    },
  },
  published: new Date().toISOString(),
  disabled: false,
};

export const organizationRepository: Repository = {
  account_id: "org_id",
  repository_id: "org_repo_id",
  state: RepositoryState.Listed,
  data_mode: RepositoryDataMode.Open,
  featured: RepositoryFeatured.NotFeatured,
  meta: {
    title: "Organization Repository",
    description: "Organization Repository Description",
    tags: [],
  },
  data: {
    primary_mirror: "s3_data_connection",
    mirrors: {
      s3_data_connection: {
        prefix: "org_id/org_repo_id/",
      },
    },
  },
  published: new Date().toISOString(),
  disabled: false,
};

export const featuredRepository: Repository = {
  account_id: "org_id",
  repository_id: "featured_repo_id",
  state: RepositoryState.Listed,
  data_mode: RepositoryDataMode.Open,
  featured: RepositoryFeatured.Featured,
  meta: {
    title: "Featured Repository",
    description: "Featured Repository Description",
    tags: [],
  },
  data: {
    primary_mirror: "s3_data_connection",
    mirrors: {
      s3_data_connection: {
        prefix: "org_id/featured_repo_id/",
      },
    },
  },
  published: new Date().toISOString(),
  disabled: false,
};

export const disabledRepository: Repository = {
  account_id: "org_id",
  repository_id: "disabled_repo_id",
  state: RepositoryState.Listed,
  data_mode: RepositoryDataMode.Open,
  featured: RepositoryFeatured.Featured,
  meta: {
    title: "Disabled Repository",
    description: "Disabled Repository Description",
    tags: [],
  },
  data: {
    primary_mirror: "s3_data_connection",
    mirrors: {
      s3_data_connection: {
        prefix: "org_id/disabled_repo_id/",
      },
    },
  },
  published: new Date().toISOString(),
  disabled: true,
};

export const privateRepository: Repository = {
  account_id: "org_id",
  repository_id: "private_repo_id",
  state: RepositoryState.Listed,
  data_mode: RepositoryDataMode.Private,
  featured: RepositoryFeatured.Featured,
  meta: {
    title: "Private Repository",
    description: "Private Repository Description",
    tags: [],
  },
  data: {
    primary_mirror: "s3_data_connection",
    mirrors: {
      s3_data_connection: {
        prefix: "org_id/private_repo_id/",
      },
    },
  },
  published: new Date().toISOString(),
  disabled: false,
};

export const subscriptionRepository: Repository = {
  account_id: "org_id",
  repository_id: "subscription_repo_id",
  state: RepositoryState.Listed,
  data_mode: RepositoryDataMode.Subscription,
  featured: RepositoryFeatured.Featured,
  meta: {
    title: "Subscription Repository",
    description: "Subscription Repository Description",
    tags: [],
  },
  data: {
    primary_mirror: "s3_data_connection",
    mirrors: {
      s3_data_connection: {
        prefix: "org_id/subscription_repo_id/",
      },
    },
  },
  published: new Date().toISOString(),
  disabled: false,
};
