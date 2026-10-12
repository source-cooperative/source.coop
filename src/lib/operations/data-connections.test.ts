import {
  accountsTable,
  dataConnectionsTable,
} from "@/lib/clients/database";
import {
  canCreateProductForAccount,
  canManageAccountDataConnections,
  isAdmin,
  isAuthorized,
} from "@/lib/api/authz";
import {
  Account,
  DataConnection,
  DataConnectionAuthenticationType,
  DataProvider,
  UserSession,
} from "@/types";
import {
  getDataConnection,
  listDataConnections,
  updateDataConnection,
} from "./data-connections";

jest.mock("@/lib/clients/database", () => ({
  dataConnectionsTable: {
    fetchById: jest.fn(),
    listAll: jest.fn(),
    update: jest.fn(async (c) => c),
  },
  accountsTable: { fetchById: jest.fn() },
  productsTable: {},
}));
jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn(() => true),
  isAdmin: jest.fn(() => false),
  canCreateProductForAccount: jest.fn(),
  canManageAccountDataConnections: jest.fn(() => true),
}));

const session = { identity_id: "id", account: { account_id: "alice" } } as UserSession;

const connection = (overrides: Partial<DataConnection>): DataConnection => ({
  data_connection_id: "shared",
  name: "Shared",
  read_only: false,
  allowed_visibilities: [],
  details: {
    provider: DataProvider.S3,
    bucket: "b",
    base_prefix: "",
    region: "us-east-1" as never,
  },
  authentication: {
    type: DataConnectionAuthenticationType.S3AccessKey,
    access_key_id: "KEY",
    secret_access_key: "SECRET",
  },
  ...overrides,
});

const shared = connection({});
const acme = connection({ data_connection_id: "acme--own", owner: "acme" });
const other = connection({ data_connection_id: "other--own", owner: "other" });

beforeEach(() => {
  jest.clearAllMocks();
  (dataConnectionsTable.listAll as jest.Mock).mockResolvedValue([shared, acme, other]);
  (accountsTable.fetchById as jest.Mock).mockResolvedValue({ account_id: "acme" } as Account);
});

const ids = (result: Awaited<ReturnType<typeof listDataConnections>>) =>
  result.ok ? result.value.map((c) => c.data_connection_id) : result;

describe("listDataConnections", () => {
  test("usable_for offers the platform's connections and the account's own, not another's", async () => {
    (canCreateProductForAccount as jest.Mock).mockReturnValue(true);
    expect(ids(await listDataConnections(session, { usable_for: "acme" }))).toEqual([
      "shared",
      "acme--own",
    ]);
  });

  test("usable_for refuses an account the caller can't create products under", async () => {
    (canCreateProductForAccount as jest.Mock).mockReturnValue(false);
    const result = await listDataConnections(session, { usable_for: "acme" });
    expect(result).toMatchObject({ ok: false, error: "forbidden" });
    const anonymous = await listDataConnections(null, { usable_for: "acme" });
    expect(anonymous).toMatchObject({ ok: false, error: "unauthenticated" });
  });

  test("owner lists only that account's connections", async () => {
    expect(ids(await listDataConnections(session, { owner: "acme" }))).toEqual(["acme--own"]);
  });

  test("never returns a secret", async () => {
    const result = await listDataConnections(session, {});
    expect(result.ok && result.value.every((c) => !c.authentication)).toBe(true);
  });
});

test("getDataConnection strips secrets", async () => {
  (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(shared);
  const result = await getDataConnection(session, "shared");
  expect(result).toMatchObject({ ok: true, value: { data_connection_id: "shared" } });
  expect(result.ok && result.value.authentication).toBeUndefined();
  (isAuthorized as jest.Mock).mockReturnValueOnce(false);
  expect(await getDataConnection(session, "shared")).toMatchObject({ error: "forbidden" });
});

describe("updateDataConnection", () => {
  beforeEach(() => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(acme);
  });
  const written = () =>
    (dataConnectionsTable.update as jest.Mock).mock.calls[0][0] as DataConnection;

  test("keeps the owner, the id and the stored secrets", async () => {
    const result = await updateDataConnection(session, "acme--own", {
      name: "Renamed",
      owner: "mallory",
      data_connection_id: "mallory--own",
      authentication: {
        type: DataConnectionAuthenticationType.S3AccessKey,
        access_key_id: "NEWKEY",
        secret_access_key: "",
      },
    });
    expect(result.ok).toBe(true);
    expect(written()).toMatchObject({
      data_connection_id: "acme--own",
      owner: "acme",
      name: "Renamed",
      authentication: { access_key_id: "NEWKEY", secret_access_key: "SECRET" },
    });
  });

  test("leaves out fields it isn't given", async () => {
    await updateDataConnection(session, "acme--own", { read_only: true });
    expect(written()).toEqual({ ...acme, read_only: true });
  });

  test("names a nested field by its path", async () => {
    const result = await updateDataConnection(session, "acme--own", {
      details: { provider: DataProvider.S3, bucket: "s3://b", base_prefix: "", region: "us-east-1" },
    });
    expect(result.ok || result.fieldErrors).toHaveProperty(["details.bucket"]);
  });

  test("is refused to someone who doesn't manage the owner account", async () => {
    (canManageAccountDataConnections as jest.Mock).mockReturnValueOnce(false);
    expect(await updateDataConnection(session, "acme--own", {})).toMatchObject({
      error: "forbidden",
    });
    expect(dataConnectionsTable.update).not.toHaveBeenCalled();
    expect(isAdmin).toHaveBeenCalled();
  });
});
