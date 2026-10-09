/** @jest-environment node */
import { Actions, Product } from "@/types";
import {
  accountsTable,
  dataConnectionsTable,
  membershipsTable,
  productsTable,
} from "@/lib/clients/database";
import { canListOnProfile, isAdmin, isAuthorized } from "@/lib/api/authz";
import { getProxyCredentials } from "@/lib/actions/proxy-credentials";
import { readProxyCredentials } from "@/lib/services/proxy-credentials-read";
import { getStorageClient } from "@/lib/clients/storage";
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "./products";

jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchById: jest.fn() },
  productsTable: {
    attachAccounts: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    fetchById: jest.fn(),
    listByAccount: jest.fn(),
    listPublic: jest.fn(),
    update: jest.fn(),
  },
  dataConnectionsTable: { fetchById: jest.fn() },
  membershipsTable: { deleteByProduct: jest.fn() },
}));
jest.mock("@/lib/api/authz", () => ({
  canListOnProfile: jest.fn(),
  isAdmin: jest.fn(),
  isAuthorized: jest.fn(),
}));
jest.mock("@/lib/actions/proxy-credentials", () => ({ getProxyCredentials: jest.fn() }));
jest.mock("@/lib/services/proxy-credentials-read", () => ({
  readProxyCredentials: jest.fn(),
}));
jest.mock("@/lib/clients/storage", () => ({ getStorageClient: jest.fn() }));

const SESSION = { identity_id: "user-1", account: { account_id: "alice", flags: [] } } as never;

const product = (overrides: Record<string, unknown> = {}) =>
  ({
    account_id: "alice",
    product_id: "my-product",
    title: "My Product",
    description: "A description",
    visibility: "public",
    disabled: false,
    metadata: { primary_mirror: "conn-x", mirrors: {} },
    ...overrides,
  }) as unknown as Product;

const connection = (overrides: Record<string, unknown> = {}) => ({
  data_connection_id: "conn-x",
  name: "Test Connection",
  read_only: false,
  allowed_visibilities: ["public", "restricted"],
  ...overrides,
});

const allowExcept = (denied: Actions) =>
  (isAuthorized as jest.Mock).mockImplementation((_s, _r, action) => action !== denied);

beforeEach(() => {
  jest.resetAllMocks();
  (isAuthorized as jest.Mock).mockReturnValue(true);
  (accountsTable.fetchById as jest.Mock).mockResolvedValue({ account_id: "alice" });
  (productsTable.attachAccounts as jest.Mock).mockImplementation(async (p) => p);
  (productsTable.create as jest.Mock).mockImplementation(async (p) => p);
  (productsTable.update as jest.Mock).mockImplementation(async (p) => p);
});

describe("listProducts", () => {
  const key = { account_id: "alice", product_id: "b" };
  const cursor = Buffer.from(JSON.stringify(key)).toString("base64");

  test("pages through an account's products, showing only those the caller may", async () => {
    const [shown, hidden] = [product(), product({ product_id: "hidden" })];
    (productsTable.listByAccount as jest.Mock).mockResolvedValue({
      products: [shown, hidden],
      lastEvaluatedKey: key,
    });
    (canListOnProfile as jest.Mock).mockImplementation((_s, p) => p === shown);

    const result = await listProducts(SESSION, { limit: "10", cursor }, "alice");

    expect(productsTable.listByAccount).toHaveBeenCalledWith("alice", 10, key);
    expect(result).toEqual({ ok: true, value: { items: [shown], next_cursor: cursor } });
  });

  test("searches public products, and the last page has no cursor", async () => {
    (productsTable.listPublic as jest.Mock).mockResolvedValue({ products: [] });

    const result = await listProducts(null, { q: "rivers", tags: "a,b", featured: "true" });

    expect(productsTable.listPublic).toHaveBeenCalledWith(20, undefined, {
      search: "rivers",
      tags: "a,b",
      featuredOnly: true,
    });
    expect(result).toEqual({ ok: true, value: { items: [], next_cursor: null } });
  });

  test("hides public products the caller may not list", async () => {
    (productsTable.listPublic as jest.Mock).mockResolvedValue({ products: [product()] });
    allowExcept(Actions.ListRepository);
    const result = await listProducts(null, {});
    expect(result.ok && result.value.items).toEqual([]);
  });

  test.each(["not base64 json", Buffer.from('["a"]').toString("base64")])(
    "refuses a cursor that isn't one: %s",
    async (cursor) => {
      expect(await listProducts(null, { cursor })).toMatchObject({
        error: "invalid",
        fieldErrors: { cursor: expect.any(Array) },
      });
    }
  );

  test("refuses a limit over 100", async () => {
    expect(await listProducts(null, { limit: "101" })).toMatchObject({ error: "invalid" });
  });

  test("an account that doesn't exist is not found", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(null);
    expect(await listProducts(null, {}, "nobody")).toMatchObject({ error: "not_found" });
  });
});

describe("getProduct", () => {
  test("returns a product the caller may see", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product());
    expect(await getProduct(null, "alice", "my-product")).toMatchObject({ ok: true });
  });

  test("refuses a stranger, asking for credentials when there are none", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product());
    allowExcept(Actions.GetRepository);
    expect(await getProduct(null, "alice", "my-product")).toMatchObject({
      error: "unauthenticated",
    });
    expect(await getProduct(SESSION, "alice", "my-product")).toMatchObject({
      error: "forbidden",
    });
  });

  test("a deactivated product is not found by anyone who may not see it", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product({ disabled: true }));
    allowExcept(Actions.GetRepository);
    expect(await getProduct(SESSION, "alice", "my-product")).toMatchObject({
      error: "not_found",
    });
  });
});

describe("createProduct", () => {
  const input = (overrides: Record<string, unknown> = {}) => ({
    title: "My Product",
    account_id: "alice",
    product_id: "my-product",
    description: "A description",
    visibility: "public",
    data_connection_id: "conn-x",
    ...overrides,
  });

  test("builds mirror metadata from the selected data connection", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection({ prefix_template: "{{repository.account_id}}/{{repository.repository_id}}/" })
    );

    const result = await createProduct(SESSION, input());

    expect(result.ok).toBe(true);
    const created = (productsTable.create as jest.Mock).mock.calls[0][0];
    expect(created).not.toHaveProperty("data_connection_id");
    expect(created.metadata.primary_mirror).toBe("conn-x");
    expect(created.metadata.mirrors["conn-x"]).toMatchObject({
      connection_id: "conn-x",
      prefix: "alice/my-product/",
      is_primary: true,
    });
  });

  test("a connection without a prefix template mirrors at the root", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection());
    await createProduct(SESSION, input());
    const created = (productsTable.create as jest.Mock).mock.calls[0][0];
    expect(created.metadata.mirrors["conn-x"].prefix).toBe("");
  });

  test("rejects a visibility not allowed by the data connection", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection({ allowed_visibilities: ["public"] })
    );
    expect(await createProduct(SESSION, input({ visibility: "restricted" }))).toMatchObject({
      error: "invalid",
      fieldErrors: { visibility: expect.any(Array) },
    });
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("rejects unauthorized creation before any lookup", async () => {
    allowExcept(Actions.CreateRepository);
    expect(await createProduct(SESSION, input())).toMatchObject({ error: "forbidden" });
    expect(accountsTable.fetchById).not.toHaveBeenCalled();
    expect(productsTable.fetchById).not.toHaveBeenCalled();
    expect(dataConnectionsTable.fetchById).not.toHaveBeenCalled();
  });

  test("refuses to overwrite a product that already exists", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product());
    expect(await createProduct(SESSION, input())).toMatchObject({ error: "conflict" });
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("an account that doesn't exist is not found", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(null);
    expect(await createProduct(SESSION, input())).toMatchObject({ error: "not_found" });
  });

  test("rejects when the data connection does not exist", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(null);
    expect(await createProduct(SESSION, input())).toMatchObject({
      error: "invalid",
      fieldErrors: { data_connection_id: expect.any(Array) },
    });
  });

  test("rejects when the user may not use the data connection", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection());
    allowExcept(Actions.UseDataConnection);
    expect(await createProduct(SESSION, input())).toEqual(
      expect.objectContaining({
        error: "forbidden",
        message: "You are not permitted to use the selected data connection",
      })
    );
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("rejects when no data connection is selected", async () => {
    expect(await createProduct(SESSION, input({ data_connection_id: "" }))).toMatchObject({
      error: "invalid",
      fieldErrors: { data_connection_id: ["A data connection is required"] },
    });
    expect(dataConnectionsTable.fetchById).not.toHaveBeenCalled();
  });

  test("rejects a connection owned by a different account", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection({ owner: "org-other" })
    );
    expect(await createProduct(SESSION, input())).toMatchObject({
      error: "invalid",
      fieldErrors: {
        data_connection_id: ["Selected data connection is not available for this account"],
      },
    });
  });

  test.each([["alice"], [undefined]])("allows a connection owned by %s", async (owner) => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection({ owner }));
    expect(await createProduct(SESSION, input())).toMatchObject({ ok: true });
  });

  test("needs a session", async () => {
    expect(await createProduct(null, input())).toMatchObject({ error: "unauthenticated" });
  });
});

describe("updateProduct", () => {
  beforeEach(() => (productsTable.fetchById as jest.Mock).mockResolvedValue(product()));

  test("rejects a visibility not allowed by the product's data connection", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection({ allowed_visibilities: ["public"] })
    );
    expect(
      await updateProduct(SESSION, "alice", "my-product", { visibility: "restricted" })
    ).toMatchObject({ error: "invalid", fieldErrors: { visibility: expect.any(Array) } });
    expect(productsTable.update).not.toHaveBeenCalled();
  });

  test("allows a visibility permitted by the product's data connection", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection());
    const result = await updateProduct(SESSION, "alice", "my-product", {
      visibility: "restricted",
    });
    expect(result.ok && result.value.visibility).toBe("restricted");
  });

  test("rejects a visibility change when the data connection no longer exists", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(null);
    expect(
      await updateProduct(SESSION, "alice", "my-product", { visibility: "restricted" })
    ).toMatchObject({ error: "invalid" });
  });

  test("changes only the fields given, without re-checking an unchanged visibility", async () => {
    const result = await updateProduct(SESSION, "alice", "my-product", {
      visibility: "public",
      title: "New",
    });
    expect(dataConnectionsTable.fetchById).not.toHaveBeenCalled();
    expect(result.ok && result.value).toMatchObject({
      title: "New",
      description: "A description",
    });
  });

  test.each([true, false])("sets disabled to %s", async (disabled) => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product({ disabled: !disabled }));
    const result = await updateProduct(SESSION, "alice", "my-product", { disabled });
    expect(result.ok && result.value.disabled).toBe(disabled);
  });

  test("refuses whoever may not edit the product", async () => {
    allowExcept(Actions.PutRepository);
    expect(await updateProduct(SESSION, "alice", "my-product", {})).toMatchObject({
      error: "forbidden",
    });
  });

  test("refuses a field of the wrong type", async () => {
    expect(
      await updateProduct(SESSION, "alice", "my-product", { disabled: "yes" })
    ).toMatchObject({ error: "invalid", fieldErrors: { disabled: expect.any(Array) } });
  });
});

describe("deleteProduct", () => {
  const withMirror = () =>
    product({
      metadata: {
        primary_mirror: "conn-1",
        mirrors: { "conn-1": { connection_id: "conn-1", prefix: "alice/my-product/" } },
      },
    });
  const keep = { preserve_data: "true" };
  let deleteByPrefix: jest.Mock;

  beforeEach(() => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(withMirror());
    (getProxyCredentials as jest.Mock).mockResolvedValue({ accessKeyId: "AK" });
    deleteByPrefix = jest.fn();
    (getStorageClient as jest.Mock).mockResolvedValue({ deleteByPrefix });
  });

  test("deletes product data through the proxy with the caller's credentials", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue({ read_only: false });

    expect(await deleteProduct(SESSION, "alice", "my-product", {})).toMatchObject({ ok: true });

    expect(readProxyCredentials).toHaveBeenCalled();
    // Minted for the verified session identity, not request params.
    expect(getProxyCredentials).toHaveBeenCalledWith("user-1");
    expect(deleteByPrefix).toHaveBeenCalledWith("alice", "my-product/");
    expect(membershipsTable.deleteByProduct).toHaveBeenCalledWith("alice", "my-product");
    expect(productsTable.delete).toHaveBeenCalledWith("alice", "my-product");
  });

  test("does not touch storage for a read-only data connection, even to keep it", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue({ read_only: true });
    for (const query of [{}, keep]) {
      expect(await deleteProduct(SESSION, "alice", "my-product", query)).toMatchObject({
        ok: true,
      });
    }
    expect(getStorageClient).not.toHaveBeenCalled();
  });

  test("refuses to keep data on a system connection for a non-admin", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue({ read_only: false });
    expect(await deleteProduct(SESSION, "alice", "my-product", keep)).toMatchObject({
      error: "forbidden",
      message: expect.stringMatching(/not permitted to keep/),
    });
    expect(productsTable.delete).not.toHaveBeenCalled();
  });

  test.each([
    ["an owned connection", { read_only: false, owner: "someone-else" }, false],
    ["a system connection, for an admin", { read_only: false }, true],
  ])("keeps data on %s when asked", async (_, conn, admin) => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(conn);
    (isAdmin as jest.Mock).mockReturnValue(admin);
    expect(await deleteProduct(SESSION, "alice", "my-product", keep)).toMatchObject({
      ok: true,
    });
    expect(deleteByPrefix).not.toHaveBeenCalled();
    expect(productsTable.delete).toHaveBeenCalled();
  });

  test("refuses whoever may not delete the product", async () => {
    allowExcept(Actions.DeleteRepository);
    expect(await deleteProduct(SESSION, "alice", "my-product", {})).toMatchObject({
      error: "forbidden",
    });
  });

  test("refuses a preserve_data that isn't true or false", async () => {
    expect(
      await deleteProduct(SESSION, "alice", "my-product", { preserve_data: "1" })
    ).toMatchObject({ error: "invalid" });
  });
});
