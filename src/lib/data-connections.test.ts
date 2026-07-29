import { canManageDataConnection } from "./data-connections";
import { isAdmin, canManageAccountDataConnections } from "@/lib/api/authz";
import { accountsTable } from "@/lib/clients/database";
import { Account, DataConnection, UserSession } from "@/types";

jest.mock("@/lib/api/authz", () => ({
  // isAuthorized is imported by the module under test (listUsableDataConnections)
  // but unused by these tests; stub it so the import resolves.
  isAuthorized: jest.fn(),
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
