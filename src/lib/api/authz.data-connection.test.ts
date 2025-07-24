import { isAuthorized } from "@/lib/api/authz";
import {
  Actions,
  UserSession,
  Membership,
  DataConnection,
  S3Regions,
  DataProvider,
  RepositoryDataMode,
  AccountFlags,
  DataConnectionAuthenticationType,
} from "@/types";
import { accounts, memberships } from "./utils.mock";

function createUserSession(
  accountId: string,
  userMemberships: Membership[] = []
): UserSession {
  const account = accounts.find((a) => a.account_id === accountId);
  if (!account) throw new Error(`Account ${accountId} not found in mock data`);
  const accountMemberships = userMemberships.filter(
    (m) => m.account_id === accountId
  );
  return { account, memberships: accountMemberships };
}

// --- Begin extracted tests ---

describe("Authorization: Data Connection Actions", () => {
  const adminSession = createUserSession("admin");
  const disabledSession = createUserSession("disabled");
  const regularSession = createUserSession("regular-user");
  const _orgOwnerSession = createUserSession(
    "organization-owner-user",
    memberships
  );

  // Create mock data connections for testing
  const primaryConnection: DataConnection = {
    data_connection_id: "primary-data-connection",
    name: "Primary Data Connection",
    prefix_template: undefined,
    read_only: false,
    allowed_data_modes: [RepositoryDataMode.Open, RepositoryDataMode.Private],
    required_flag: undefined,
    details: {
      provider: DataProvider.S3,
      bucket: "source-coop-data",
      base_prefix: "organization/org-repo-id/",
      region: S3Regions.US_EAST_1,
    },
    authentication: {
      type: DataConnectionAuthenticationType.S3AccessKey,
      access_key_id: "test-access-key",
      secret_access_key: "test-secret-key",
    },
  };

  const readOnlyConnection: DataConnection = {
    data_connection_id: "read-only-connection",
    name: "Read Only Data Connection",
    prefix_template: undefined,
    read_only: true,
    allowed_data_modes: [RepositoryDataMode.Open, RepositoryDataMode.Private],
    required_flag: undefined,
    details: {
      provider: DataProvider.S3,
      bucket: "source-coop-data",
      base_prefix: "organization/read-only/",
      region: S3Regions.US_EAST_1,
    },
    authentication: {
      type: DataConnectionAuthenticationType.S3AccessKey,
      access_key_id: "test-access-key",
      secret_access_key: "test-secret-key",
    },
  };

  const flaggedConnection: DataConnection = {
    data_connection_id: "flagged-connection",
    name: "Flagged Data Connection",
    prefix_template: undefined,
    read_only: false,
    allowed_data_modes: [RepositoryDataMode.Open, RepositoryDataMode.Private],
    required_flag: AccountFlags.CREATE_REPOSITORIES,
    details: {
      provider: DataProvider.S3,
      bucket: "source-coop-data",
      base_prefix: "organization/flagged/",
      region: S3Regions.US_EAST_1,
    },
    authentication: {
      type: DataConnectionAuthenticationType.S3AccessKey,
      access_key_id: "test-access-key",
      secret_access_key: "test-secret-key",
    },
  };

  describe("GetDataConnection", () => {
    test("admin can get any data connection", () => {
      expect(
        isAuthorized(adminSession, primaryConnection, Actions.GetDataConnection)
      ).toBe(true);
    });

    test("regular user can get data connection", () => {
      expect(
        isAuthorized(
          regularSession,
          primaryConnection,
          Actions.GetDataConnection
        )
      ).toBe(true);
    });

    test("anonymous user can get data connection", () => {
      expect(
        isAuthorized(null, primaryConnection, Actions.GetDataConnection)
      ).toBe(true);
    });

    test("disabled user cannot get data connection", () => {
      expect(
        isAuthorized(
          disabledSession,
          primaryConnection,
          Actions.GetDataConnection
        )
      ).toBe(false);
    });
  });

  describe("CreateDataConnection", () => {
    test("admin can create data connection", () => {
      expect(
        isAuthorized(
          adminSession,
          primaryConnection,
          Actions.CreateDataConnection
        )
      ).toBe(true);
    });

    test("regular user cannot create data connection", () => {
      expect(
        isAuthorized(
          regularSession,
          primaryConnection,
          Actions.CreateDataConnection
        )
      ).toBe(false);
    });

    test("anonymous user cannot create data connection", () => {
      expect(
        isAuthorized(null, primaryConnection, Actions.CreateDataConnection)
      ).toBe(false);
    });

    test("disabled user cannot create data connection", () => {
      expect(
        isAuthorized(
          disabledSession,
          primaryConnection,
          Actions.CreateDataConnection
        )
      ).toBe(false);
    });
  });

  describe("DisableDataConnection", () => {
    test("admin can disable data connection", () => {
      expect(
        isAuthorized(
          adminSession,
          primaryConnection,
          Actions.DisableDataConnection
        )
      ).toBe(true);
    });

    test("regular user cannot disable data connection", () => {
      expect(
        isAuthorized(
          regularSession,
          primaryConnection,
          Actions.DisableDataConnection
        )
      ).toBe(false);
    });

    test("anonymous user cannot disable data connection", () => {
      expect(
        isAuthorized(null, primaryConnection, Actions.DisableDataConnection)
      ).toBe(false);
    });

    test("disabled user cannot disable data connection", () => {
      expect(
        isAuthorized(
          disabledSession,
          primaryConnection,
          Actions.DisableDataConnection
        )
      ).toBe(false);
    });
  });

  describe("UseDataConnection", () => {
    test("admin can use any data connection", () => {
      expect(
        isAuthorized(adminSession, primaryConnection, Actions.UseDataConnection)
      ).toBe(true);
      expect(
        isAuthorized(
          adminSession,
          readOnlyConnection,
          Actions.UseDataConnection
        )
      ).toBe(true);
      expect(
        isAuthorized(adminSession, flaggedConnection, Actions.UseDataConnection)
      ).toBe(true);
    });

    test("regular user can use data connection without required flag", () => {
      expect(
        isAuthorized(
          regularSession,
          primaryConnection,
          Actions.UseDataConnection
        )
      ).toBe(true);
    });

    test("user with required flag can use flagged data connection", () => {
      const createReposSession = createUserSession("create-repositories-user");
      expect(
        isAuthorized(
          createReposSession,
          flaggedConnection,
          Actions.UseDataConnection
        )
      ).toBe(true);
    });

    test("user without required flag cannot use flagged data connection", () => {
      expect(
        isAuthorized(
          regularSession,
          flaggedConnection,
          Actions.UseDataConnection
        )
      ).toBe(false);
    });

    test("anonymous user can use data connection without required flag", () => {
      expect(
        isAuthorized(null, primaryConnection, Actions.UseDataConnection)
      ).toBe(true);
    });

    test("anonymous user cannot use flagged data connection", () => {
      expect(
        isAuthorized(null, flaggedConnection, Actions.UseDataConnection)
      ).toBe(false);
    });

    test("no one can use read-only data connection", () => {
      expect(
        isAuthorized(
          adminSession,
          readOnlyConnection,
          Actions.UseDataConnection
        )
      ).toBe(false);
      expect(
        isAuthorized(
          regularSession,
          readOnlyConnection,
          Actions.UseDataConnection
        )
      ).toBe(false);
      expect(
        isAuthorized(null, readOnlyConnection, Actions.UseDataConnection)
      ).toBe(false);
    });

    test("disabled user cannot use data connection", () => {
      expect(
        isAuthorized(
          disabledSession,
          primaryConnection,
          Actions.UseDataConnection
        )
      ).toBe(false);
    });
  });

  describe("ViewDataConnectionCredentials", () => {
    test("admin can view any data connection credentials", () => {
      expect(
        isAuthorized(
          adminSession,
          primaryConnection,
          Actions.ViewDataConnectionCredentials
        )
      ).toBe(true);
    });

    test("regular user cannot view data connection credentials", () => {
      expect(
        isAuthorized(
          regularSession,
          primaryConnection,
          Actions.ViewDataConnectionCredentials
        )
      ).toBe(false);
    });

    test("anonymous user cannot view data connection credentials", () => {
      expect(
        isAuthorized(
          null,
          primaryConnection,
          Actions.ViewDataConnectionCredentials
        )
      ).toBe(false);
    });

    test("disabled user cannot view data connection credentials", () => {
      expect(
        isAuthorized(
          disabledSession,
          primaryConnection,
          Actions.ViewDataConnectionCredentials
        )
      ).toBe(false);
    });
  });

  describe("PutDataConnection", () => {
    test("admin can update any data connection", () => {
      expect(
        isAuthorized(adminSession, primaryConnection, Actions.PutDataConnection)
      ).toBe(true);
    });

    test("regular user cannot update data connection", () => {
      expect(
        isAuthorized(
          regularSession,
          primaryConnection,
          Actions.PutDataConnection
        )
      ).toBe(false);
    });

    test("anonymous user cannot update data connection", () => {
      expect(
        isAuthorized(null, primaryConnection, Actions.PutDataConnection)
      ).toBe(false);
    });

    test("disabled user cannot update data connection", () => {
      expect(
        isAuthorized(
          disabledSession,
          primaryConnection,
          Actions.PutDataConnection
        )
      ).toBe(false);
    });
  });
});
