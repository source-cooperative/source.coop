import {
  accountsTable,
  dataConnectionsTable,
  productsTable,
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
  createDataConnection,
  deleteDataConnection,
  getDataConnection,
  listDataConnections,
  updateDataConnection,
} from "./data-connections";

jest.mock("@/lib/clients/database", () => ({
  dataConnectionsTable: {
    fetchById: jest.fn(),
    listAll: jest.fn(),
    create: jest.fn(async (c) => c),
    update: jest.fn(async (c) => c),
    delete: jest.fn(),
  },
  accountsTable: { fetchById: jest.fn() },
  productsTable: { listProductsByConnectionId: jest.fn() },
}));
jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn(),
  isAdmin: jest.fn(),
  canCreateProductForAccount: jest.fn(),
  canManageAccountDataConnections: jest.fn(),
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
const acme = connection({ data_connection_id: "acme--own", name: "Acme", owner: "acme" });
const other = connection({ data_connection_id: "other--own", name: "Other", owner: "other" });

/** alice manages acme's connections and nobody else's. */
const managesAcme = (s: UserSession | null, account: Account) =>
  s === session && account.account_id === "acme";

beforeEach(() => {
  jest.clearAllMocks();
  (isAuthorized as jest.Mock).mockReturnValue(true);
  (isAdmin as jest.Mock).mockReturnValue(false);
  (dataConnectionsTable.listAll as jest.Mock).mockResolvedValue([shared, acme, other]);
  (accountsTable.fetchById as jest.Mock).mockImplementation(async (id) => ({ account_id: id }));
  (canManageAccountDataConnections as jest.Mock).mockImplementation(managesAcme);
  (productsTable.listProductsByConnectionId as jest.Mock).mockResolvedValue([]);
});

const ids = (result: Awaited<ReturnType<typeof listDataConnections>>) =>
  result.ok ? result.value.items.map((c) => c.data_connection_id) : result;

describe("listDataConnections", () => {
  test("shows the platform's connections and the owned ones the caller manages", async () => {
    expect(ids(await listDataConnections(session, {}))).toEqual(["acme--own", "shared"]);
    expect(ids(await listDataConnections(null, {}))).toEqual(["shared"]);
  });

  test("owner lists that account's connections to those who manage it", async () => {
    expect(ids(await listDataConnections(session, { owner: "acme" }))).toEqual(["acme--own"]);
    expect(await listDataConnections(session, { owner: "other" })).toMatchObject({
      error: "forbidden",
    });
    expect(await listDataConnections(null, { owner: "acme" })).toMatchObject({
      error: "unauthenticated",
    });
  });

  test("usable_for offers the platform's connections and the account's own, not another's", async () => {
    (canCreateProductForAccount as jest.Mock).mockReturnValue(true);
    expect(ids(await listDataConnections(session, { usable_for: "acme" }))).toEqual([
      "acme--own",
      "shared",
    ]);
  });

  test("usable_for refuses an account the caller can't create products under", async () => {
    (canCreateProductForAccount as jest.Mock).mockReturnValue(false);
    expect(await listDataConnections(session, { usable_for: "acme" })).toMatchObject({
      error: "forbidden",
    });
  });

  test("is one page, and never returns a secret", async () => {
    const result = await listDataConnections(session, {});
    expect(result).toMatchObject({ ok: true, value: { next_cursor: null } });
    expect(result.ok && result.value.items.every((c) => !c.authentication)).toBe(true);
  });
});

describe("getDataConnection", () => {
  test("strips secrets", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(shared);
    const result = await getDataConnection(session, "shared");
    expect(result).toMatchObject({ ok: true, value: { data_connection_id: "shared" } });
    expect(result.ok && result.value.authentication).toBeUndefined();
  });

  test("treats an empty id as not found, without asking the database", async () => {
    expect(await getDataConnection(session, "")).toMatchObject({ error: "not_found" });
    expect(dataConnectionsTable.fetchById).not.toHaveBeenCalled();
  });
});

test("createDataConnection namespaces an owned id and returns no secret", async () => {
  const { data_connection_id: _, ...input } = acme;
  const result = await createDataConnection(session, { ...input, name: "My Bucket" });
  expect(result).toMatchObject({ ok: true, value: { data_connection_id: "acme--my-bucket" } });
  expect(result.ok && result.value.authentication).toBeUndefined();
});

describe("updateDataConnection", () => {
  beforeEach(() => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(acme);
  });
  const written = () =>
    (dataConnectionsTable.update as jest.Mock).mock.calls[0][0] as DataConnection;
  const newKeyOnly = {
    type: DataConnectionAuthenticationType.S3AccessKey,
    access_key_id: "NEWKEY",
    secret_access_key: "",
  };

  test("keeps the owner, the id and the stored secrets", async () => {
    const result = await updateDataConnection(session, "acme--own", {
      name: "Renamed",
      owner: "mallory",
      data_connection_id: "mallory--own",
      authentication: newKeyOnly,
    });
    expect(result.ok).toBe(true);
    expect(written()).toMatchObject({
      data_connection_id: "acme--own",
      owner: "acme",
      name: "Renamed",
      authentication: { access_key_id: "NEWKEY", secret_access_key: "SECRET" },
    });
  });

  test("won't carry a stored secret to another destination", async () => {
    const result = await updateDataConnection(session, "acme--own", {
      details: { ...acme.details, endpoint: "https://elsewhere.example" },
      authentication: newKeyOnly,
    });
    expect(result.ok || result.fieldErrors).toHaveProperty([
      "authentication.secret_access_key",
    ]);
    expect(dataConnectionsTable.update).not.toHaveBeenCalled();
  });

  test("won't keep stored authentication when the destination moves without it", async () => {
    const result = await updateDataConnection(session, "acme--own", {
      details: { ...acme.details, bucket: "elsewhere" },
    });
    expect(result.ok || result.fieldErrors).toHaveProperty(["authentication"]);
    expect(dataConnectionsTable.update).not.toHaveBeenCalled();
  });

  test("moves the destination when the authentication is cleared with it", async () => {
    const details = { ...acme.details, bucket: "elsewhere" };
    const result = await updateDataConnection(session, "acme--own", {
      details,
      authentication: undefined,
      read_only: true,
    });
    expect(result.ok).toBe(true);
    expect(written()).toMatchObject({ details, authentication: undefined });
  });

  test("leaves out fields it isn't given, and clears those sent as null", async () => {
    await updateDataConnection(session, "acme--own", { prefix_template: "x/" });
    (dataConnectionsTable.update as jest.Mock).mockClear();
    await updateDataConnection(session, "acme--own", {
      prefix_template: null,
      authentication: null,
      read_only: true,
    });
    expect(written()).toEqual({
      ...acme,
      prefix_template: undefined,
      authentication: undefined,
      read_only: true,
    });
  });

  test("names a nested field by its path", async () => {
    const result = await updateDataConnection(session, "acme--own", {
      details: { ...acme.details, bucket: "s3://b" },
    });
    expect(result.ok || result.fieldErrors).toHaveProperty(["details.bucket"]);
  });

  test("is refused to someone who doesn't manage the owner account", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(other);
    expect(await updateDataConnection(session, "other--own", {})).toMatchObject({
      error: "forbidden",
    });
    expect(dataConnectionsTable.update).not.toHaveBeenCalled();
  });
});

describe("deleteDataConnection", () => {
  beforeEach(() => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(acme);
  });

  test("deletes, and returns what it deleted without its secret", async () => {
    const result = await deleteDataConnection(session, "acme--own");
    expect(dataConnectionsTable.delete).toHaveBeenCalledWith("acme--own");
    expect(result).toMatchObject({ ok: true, value: { data_connection_id: "acme--own" } });
    expect(result.ok && result.value.authentication).toBeUndefined();
  });

  test("is refused while products still use the connection", async () => {
    (productsTable.listProductsByConnectionId as jest.Mock).mockResolvedValue([{}]);
    expect(await deleteDataConnection(session, "acme--own")).toMatchObject({
      error: "conflict",
    });
    expect(dataConnectionsTable.delete).not.toHaveBeenCalled();
  });
});
