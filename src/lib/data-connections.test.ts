import {
  canManageDataConnection,
  canUseDataConnectionFor,
  denyDataConnectionFor,
  listUsableDataConnections,
} from "./data-connections";
import { isAdmin, canManageAccountDataConnections } from "@/lib/api/authz";
import { accountsTable, dataConnectionsTable } from "@/lib/clients/database";
import { sessions } from "@/lib/api/utils.mock";
import {
  Account,
  AccountFlags,
  DataConnection,
  DataProvider,
  UserSession,
} from "@/types";

jest.mock("@/lib/api/authz", () => ({
  // listUsableDataConnections is exercised against the real isAuthorized (the
  // point of those tests is the authz predicate); the two helpers below are
  // stubbed for the canManageDataConnection tests.
  ...jest.requireActual("@/lib/api/authz"),
  isAdmin: jest.fn(),
  canManageAccountDataConnections: jest.fn(),
}));

jest.mock("@/lib/clients/database", () => ({
  dataConnectionsTable: { listAll: jest.fn() },
  accountsTable: { fetchById: jest.fn() },
}));

const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
const mockCanManageAccount = canManageAccountDataConnections as jest.MockedFunction<
  typeof canManageAccountDataConnections
>;
const mockAccountsTable = accountsTable as jest.Mocked<typeof accountsTable>;

const session = { identity_id: "id-1", account: {} } as UserSession;

function connection(overrides: Partial<DataConnection>): DataConnection {
  return {
    data_connection_id: "conn",
    name: "Conn",
    read_only: false,
    allowed_visibilities: [],
    details: { provider: "s3", bucket: "b", base_prefix: "", region: "us-east-1" },
    ...overrides,
  } as DataConnection;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsAdmin.mockReturnValue(false);
  mockCanManageAccount.mockReturnValue(false);
  mockAccountsTable.fetchById.mockResolvedValue({ account_id: "acme" } as Account);
});

describe("canManageDataConnection", () => {
  test("a disabled session can never manage, even as admin", async () => {
    mockIsAdmin.mockReturnValue(true);
    const disabled = { account: { disabled: true } } as UserSession;
    expect(await canManageDataConnection(disabled, connection({}))).toBe(false);
  });

  test("admins manage any connection, including system-owned", async () => {
    mockIsAdmin.mockReturnValue(true);
    expect(
      await canManageDataConnection(session, connection({ owner: undefined }))
    ).toBe(true);
    // Admin short-circuits before the owner-account lookup.
    expect(mockAccountsTable.fetchById).not.toHaveBeenCalled();
  });

  test("a system-owned connection is admin-only", async () => {
    const result = await canManageDataConnection(
      session,
      connection({ owner: undefined })
    );
    expect(result).toBe(false);
  });

  test("defers to the owner account for an owned connection", async () => {
    mockCanManageAccount.mockReturnValue(true);
    const result = await canManageDataConnection(
      session,
      connection({ owner: "acme" })
    );
    expect(result).toBe(true);
    expect(mockCanManageAccount).toHaveBeenCalledWith(
      session,
      expect.objectContaining({ account_id: "acme" })
    );
  });

  test("denies when the caller can't manage the owner account", async () => {
    mockCanManageAccount.mockReturnValue(false);
    expect(
      await canManageDataConnection(session, connection({ owner: "acme" }))
    ).toBe(false);
  });

  test("denies when the owner account no longer exists", async () => {
    mockAccountsTable.fetchById.mockResolvedValue(null);
    expect(
      await canManageDataConnection(session, connection({ owner: "ghost" }))
    ).toBe(false);
    expect(mockCanManageAccount).not.toHaveBeenCalled();
  });
});

// Regression: https://github.com/source-cooperative/source.coop/issues/461
//
// Symptom 1 of the issue — the org's connection is missing from the data
// connection selector on /products/new. This is the server half of that path:
// the list handed to ProductCreationForm. Uses the real `isAuthorized`.
describe("listUsableDataConnections (issue #461)", () => {
  // A BYOB connection created through the org's account-scoped UI.
  const orgConnection = {
    data_connection_id: "organization--byob",
    name: "Org BYOB",
    read_only: false,
    allowed_visibilities: ["public"],
    owner: "organization",
    details: {
      provider: DataProvider.S3,
      bucket: "org-bucket",
      base_prefix: "",
      region: "us-west-2",
    },
  } as unknown as DataConnection;

  const listing = (connections: DataConnection[]) =>
    (dataConnectionsTable.listAll as jest.Mock).mockResolvedValue(connections);

  const ids = (connections: DataConnection[]) =>
    connections.map((c) => c.data_connection_id);

  test("offers an org's own connection to an org owner", async () => {
    listing([orgConnection]);
    expect(
      ids(await listUsableDataConnections(sessions["organization-owner-user"], [
        "organization",
      ]))
    ).toEqual(["organization--byob"]);
  });

  test("does not require the *user* to hold CREATE_DATA_CONNECTIONS", async () => {
    // Per the issue: the flag belongs on the owner account, not the member.
    // organization-owner-user carries no create_data_connections flag.
    expect(
      sessions["organization-owner-user"]?.account?.flags
    ).not.toContain("create_data_connections");

    listing([orgConnection]);
    expect(
      ids(await listUsableDataConnections(sessions["organization-owner-user"], [
        "organization",
      ]))
    ).toEqual(["organization--byob"]);
  });

  test("offers a read-only connection", async () => {
    listing([{ ...orgConnection, read_only: true } as DataConnection]);
    expect(
      ids(await listUsableDataConnections(sessions["organization-owner-user"], [
        "organization",
      ]))
    ).toEqual(["organization--byob"]);
  });

  // The owner filter has to happen here, not in ProductCreationForm: an owned
  // connection carries its account's bucket name and prefixes, so a client-side
  // filter would still have shipped them to every user's browser.
  test("withholds another account's connection from the listing", async () => {
    listing([orgConnection]);
    expect(
      ids(await listUsableDataConnections(sessions["regular-user"], ["regular"]))
    ).toEqual([]);
  });

  test("still offers system-level connections to any account", async () => {
    listing([{ ...orgConnection, owner: undefined } as DataConnection]);
    expect(
      ids(await listUsableDataConnections(sessions["regular-user"], ["regular"]))
    ).toEqual(["organization--byob"]);
  });
});

// The single definition of which connections may back a product owned by a
// given account, and why not when they may not. `createProduct` switches on the
// reason to pick a field error. Uses the real `isAuthorized`.
describe("denyDataConnectionFor", () => {
  const user = sessions["regular-user"];

  test("allows a system-level (unowned) connection", () => {
    expect(
      denyDataConnectionFor(user, connection({ owner: undefined }), "acme")
    ).toBeNull();
  });

  test("allows a connection the account owns", () => {
    expect(
      denyDataConnectionFor(user, connection({ owner: "acme" }), "acme")
    ).toBeNull();
  });

  test("reports wrong-account for a connection another account owns", () => {
    expect(
      denyDataConnectionFor(user, connection({ owner: "rival" }), "acme")
    ).toBe("wrong-account");
  });

  test("allows a read-only connection", () => {
    expect(
      denyDataConnectionFor(
        user,
        connection({ owner: "acme", read_only: true }),
        "acme"
      )
    ).toBeNull();
  });

  test("reports not-usable for a flag-gated connection the caller lacks the flag for", () => {
    expect(
      denyDataConnectionFor(
        user,
        connection({ required_flag: AccountFlags.CREATE_DATA_CONNECTIONS }),
        "acme"
      )
    ).toBe("not-usable");
  });

  test("reports not-usable ahead of wrong-account when both apply", () => {
    expect(
      denyDataConnectionFor(
        user,
        connection({
          owner: "rival",
          required_flag: AccountFlags.CREATE_DATA_CONNECTIONS,
        }),
        "acme"
      )
    ).toBe("not-usable");
  });
});

// Which connections may back a product owned by a given account: system-level
// (unowned) plus the account's own. See issue #461. Uses the real `isAuthorized`.
describe("canUseDataConnectionFor", () => {
  const user = sessions["regular-user"];

  test("accepts a system-level (unowned) connection", () => {
    expect(
      canUseDataConnectionFor(user, connection({ owner: undefined }), "acme")
    ).toBe(true);
  });

  test("accepts a connection the account owns", () => {
    expect(
      canUseDataConnectionFor(user, connection({ owner: "acme" }), "acme")
    ).toBe(true);
  });

  test("rejects a connection another account owns", () => {
    expect(
      canUseDataConnectionFor(user, connection({ owner: "rival" }), "acme")
    ).toBe(false);
  });

  test("accepts a read-only connection the account owns", () => {
    expect(
      canUseDataConnectionFor(
        user,
        connection({ owner: "acme", read_only: true }),
        "acme"
      )
    ).toBe(true);
  });

  test("accepts a read-only system-level connection", () => {
    expect(
      canUseDataConnectionFor(
        user,
        connection({ owner: undefined, read_only: true }),
        "acme"
      )
    ).toBe(true);
  });

  test("rejects a flag-gated system connection the caller lacks the flag for", () => {
    expect(
      canUseDataConnectionFor(
        user,
        connection({ required_flag: AccountFlags.CREATE_DATA_CONNECTIONS }),
        "acme"
      )
    ).toBe(false);
  });
});

