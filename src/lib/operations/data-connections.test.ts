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
  listAllDataConnections,
  listDataConnections,
  updateDataConnection,
} from "./data-connections";

jest.mock("@/lib/clients/database", () => ({
  dataConnectionsTable: {
    fetchById: jest.fn(),
    listPage: jest.fn(),
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

const shared = connection({
  details: { provider: DataProvider.S3, bucket: "shared", base_prefix: "", region: "us-east-1" as never },
});
const roleIn = (account: string) => ({
  type: DataConnectionAuthenticationType.S3WebIdentityRole as const,
  role_arn: `arn:aws:iam::${account}:role/reader`,
});
/** The platform's own storage, as an unowned connection names it. */
const opendata = connection({
  data_connection_id: "opendata",
  details: { ...shared.details, bucket: "us-west-2.opendata.example" },
  authentication: roleIn("111111111111"),
});
const acme = connection({ data_connection_id: "acme--own", name: "Acme", owner: "acme" });
const other = connection({ data_connection_id: "other--own", name: "Other", owner: "other" });

/** alice manages acme's connections and nobody else's. */
const managesAcme = (s: UserSession | null, account: Account) =>
  s === session && account.account_id === "acme";

beforeEach(() => {
  jest.clearAllMocks();
  (isAuthorized as jest.Mock).mockReturnValue(true);
  (isAdmin as jest.Mock).mockReturnValue(false);
  (dataConnectionsTable.listPage as jest.Mock).mockImplementation(scan([shared, acme, other]));
  (dataConnectionsTable.listAll as jest.Mock).mockResolvedValue([shared, opendata, acme, other]);
  (accountsTable.fetchById as jest.Mock).mockImplementation(async (id) => ({ account_id: id }));
  (canManageAccountDataConnections as jest.Mock).mockImplementation(managesAcme);
  (productsTable.listProductsByConnectionId as jest.Mock).mockResolvedValue([]);
});

/** A Scan of `table`: Limit counts what's read, before the owner filter. */
const scan =
  (table: DataConnection[]) =>
  async (
    limit: number,
    start?: { data_connection_id: string },
    owner?: string,
    withUnowned = false
  ) => {
    const from = start
      ? table.findIndex((c) => c.data_connection_id === start.data_connection_id) + 1
      : 0;
    const read = table.slice(from, from + limit);
    return {
      connections: read.filter(
        (c) => !owner || c.owner === owner || (withUnowned && !c.owner)
      ),
      lastEvaluatedKey:
        from + limit < table.length
          ? { data_connection_id: read[read.length - 1].data_connection_id }
          : undefined,
    };
  };

const ids = (result: Awaited<ReturnType<typeof listDataConnections>>) =>
  result.ok ? result.value.items.map((c) => c.data_connection_id) : result;

describe("listDataConnections", () => {
  test("shows the platform's connections and the owned ones the caller manages", async () => {
    expect(ids(await listDataConnections(session, {}))).toEqual(["shared", "acme--own"]);
  });

  test("is refused to a caller who isn't signed in", async () => {
    expect(await listDataConnections(null, {})).toMatchObject({ error: "unauthenticated" });
    expect(dataConnectionsTable.listPage).not.toHaveBeenCalled();
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
      "shared",
      "acme--own",
    ]);
  });

  test("owner narrows usable_for to that account's own", async () => {
    (canCreateProductForAccount as jest.Mock).mockReturnValue(true);
    expect(
      ids(await listDataConnections(session, { usable_for: "acme", owner: "acme" }))
    ).toEqual(["acme--own"]);
  });

  test("usable_for refuses an account the caller can't create products under", async () => {
    (canCreateProductForAccount as jest.Mock).mockReturnValue(false);
    expect(await listDataConnections(session, { usable_for: "acme" })).toMatchObject({
      error: "forbidden",
    });
  });

  test("never returns a secret", async () => {
    const result = await listDataConnections(session, {});
    expect(result).toMatchObject({ ok: true, value: { next_cursor: null } });
    expect(result.ok && result.value.items.every((c) => !c.authentication)).toBe(true);
  });

  test("pages through the table, a page short when the filter drops what it read", async () => {
    const first = await listDataConnections(session, { owner: "acme", limit: "1" });
    expect(ids(first)).toEqual([]);
    const cursor = first.ok ? first.value.next_cursor : null;
    expect(cursor).toEqual(expect.any(String));
    const second = await listDataConnections(session, { owner: "acme", limit: "1", cursor });
    expect(ids(second)).toEqual(["acme--own"]);
  });

  test("refuses a cursor that isn't a connection's key", async () => {
    const forged = Buffer.from(JSON.stringify({ account_id: "x" })).toString("base64url");
    for (const cursor of [forged, "not base64 json"]) {
      expect(await listDataConnections(session, { cursor })).toMatchObject({
        error: "invalid",
        fieldErrors: { cursor: ["Invalid cursor"] },
      });
    }
  });
});

describe("listAllDataConnections", () => {
  test("follows every page and sorts by provider, then name", async () => {
    const many = Array.from({ length: 150 }, (_, i) =>
      connection({ data_connection_id: `conn-${i}`, name: `C${String(149 - i).padStart(3, "0")}` })
    );
    (dataConnectionsTable.listPage as jest.Mock).mockImplementation(scan(many));
    const result = await listAllDataConnections(session, {});
    expect(result.ok && result.value.length).toBe(150);
    expect(result.ok && result.value[0].name).toBe("C000");
    expect(dataConnectionsTable.listPage).toHaveBeenCalledTimes(2);
  });

  test("passes a refusal through", async () => {
    expect(await listAllDataConnections(session, { owner: "other" })).toMatchObject({
      error: "forbidden",
    });
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

describe("createDataConnection", () => {
  const { data_connection_id: _, ...acmeInput } = acme;
  const input = { ...acmeInput, name: "My Bucket", authentication: roleIn("222222222222") };
  const create = (changes: Record<string, unknown>) =>
    createDataConnection(session, { ...input, ...changes });
  const fieldErrors = async (changes: Record<string, unknown>) => {
    const result = await create(changes);
    expect(dataConnectionsTable.create).not.toHaveBeenCalled();
    return result.ok ? {} : result.fieldErrors;
  };

  test("namespaces an owned id", async () => {
    expect(await create({})).toMatchObject({
      ok: true,
      value: { data_connection_id: "acme--my-bucket", authentication: input.authentication },
    });
  });

  test.each([
    shared.authentication,
    { type: DataConnectionAuthenticationType.AzureSasToken, sas_token: "sv=x" },
  ])("refuses an authentication type the data proxy can't sign with", async (authentication) => {
    expect(await fieldErrors({ authentication })).toHaveProperty(["authentication.type"]);
  });

  test("refuses the same types to an admin creating a platform connection", async () => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    expect(
      await fieldErrors({ owner: undefined, authentication: shared.authentication })
    ).toHaveProperty(["authentication.type"]);
  });

  test("keeps an owned connection off the platform's buckets", async () => {
    expect(await fieldErrors({ details: opendata.details })).toHaveProperty(["details.bucket"]);
  });

  test.each(["arn:aws:iam::111111111111:role/reader", "arn:aws:iam::111111111111:role/other"])(
    "keeps an owned connection off roles in the platform's AWS account: %s",
    async (role_arn) => {
      const authentication = { ...input.authentication, role_arn };
      expect(await fieldErrors({ authentication })).toHaveProperty([
        "authentication.role_arn",
      ]);
    }
  );

  test("lets an admin create a platform connection on the platform's storage", async () => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    const { data_connection_id: _, ...platform } = opendata;
    expect(
      await createDataConnection(session, { ...platform, name: "Another region" })
    ).toMatchObject({ ok: true });
  });

  test.each([
    [{ details: { ...input.details, base_prefix: "/data/" } }, "details.base_prefix"],
    [{ details: { ...input.details, base_prefix: "data/../" } }, "details.base_prefix"],
    [{ prefix_template: "/{{repository.repository_id}}/" }, "prefix_template"],
    [{ prefix_template: "../{{repository.repository_id}}/" }, "prefix_template"],
    // Fine apart, but joined they make "data..x".
    [
      { details: { ...input.details, base_prefix: "data." }, prefix_template: ".x" },
      "prefix_template",
    ],
  ])("refuses a prefix that leaves its bucket: %j", async (changes, field) => {
    expect(await fieldErrors(changes)).toHaveProperty([field]);
  });

  test("accepts a template without the account in it, on a bucket of the account's own", async () => {
    expect(
      await create({
        details: { ...input.details, base_prefix: "products/" },
        prefix_template: "{{repository.repository_id}}/",
      })
    ).toMatchObject({ ok: true });
  });
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

  test("moves a platform connection when the authentication is cleared with it", async () => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(shared);
    const details = { ...shared.details, bucket: "elsewhere" };
    const result = await updateDataConnection(session, "shared", {
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
      required_flag: null,
    });
    expect(written()).toEqual({ ...acme, prefix_template: undefined });
  });

  test("keeps an unsupported authentication type a row already has", async () => {
    // acme's stored access key is a type no new connection may choose.
    expect(await updateDataConnection(session, "acme--own", { name: "Renamed" })).toMatchObject({
      ok: true,
    });
  });

  test("won't switch a connection to an unsupported authentication type", async () => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(opendata);
    const result = await updateDataConnection(session, "opendata", {
      authentication: shared.authentication,
    });
    expect(result.ok || result.fieldErrors).toHaveProperty(["authentication.type"]);
    expect(dataConnectionsTable.update).not.toHaveBeenCalled();
  });

  describe("on an owned connection", () => {
    const owned = connection({
      data_connection_id: "acme--role",
      owner: "acme",
      authentication: roleIn("222222222222"),
    });
    beforeEach(() => {
      (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(owned);
    });
    const fieldErrors = async (changes: Record<string, unknown>) => {
      const result = await updateDataConnection(session, "acme--role", changes);
      expect(dataConnectionsTable.update).not.toHaveBeenCalled();
      return result.ok ? {} : result.fieldErrors;
    };

    test.each([
      [{ details: { ...owned.details, bucket: "elsewhere" } }, "details.bucket"],
      [
        { details: { provider: DataProvider.GCS, bucket: "b", base_prefix: "" } },
        "details.provider",
      ],
      [{ authentication: undefined, read_only: true }, "authentication.type"],
    ])("won't change where it points: %j", async (changes, field) => {
      expect(
        await fieldErrors({ authentication: owned.authentication, ...changes })
      ).toHaveProperty([field]);
    });

    test("holds an admin to the same rule", async () => {
      (isAdmin as jest.Mock).mockReturnValue(true);
      expect(
        await fieldErrors({
          details: { ...owned.details, bucket: "elsewhere" },
          authentication: owned.authentication,
        })
      ).toHaveProperty(["details.bucket"]);
    });

    test("won't move its role into the platform's AWS account", async () => {
      expect(await fieldErrors({ authentication: roleIn("111111111111") })).toHaveProperty([
        "authentication.role_arn",
      ]);
    });

    test("won't take a prefix that leaves its bucket", async () => {
      expect(await fieldErrors({ prefix_template: "../x/" })).toHaveProperty([
        "prefix_template",
      ]);
    });

    test("changes its region, prefix and role", async () => {
      const changes = {
        details: { ...owned.details, region: "us-west-2", base_prefix: "data/" },
        authentication: roleIn("333333333333"),
      };
      const result = await updateDataConnection(session, "acme--role", changes);
      expect(result.ok).toBe(true);
      expect(written()).toMatchObject(changes);
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
