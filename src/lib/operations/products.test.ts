/** @jest-environment node */
import { Actions, Product } from "@/types";
import {
  accountsTable,
  dataConnectionsTable,
  membershipsTable,
  productsTable,
  tagsTable,
  hidePendingTags,
} from "@/lib/clients/database";
import { canListOnProfile, isAdmin, isAuthorized } from "@/lib/api/authz";
import { getProxyCredentials } from "@/lib/actions/proxy-credentials";
import { getStorageClient } from "@/lib/clients/storage";
import { revalidatePath } from "next/cache";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProductPermissions,
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
  tagsTable: { listAll: jest.fn(), suggest: jest.fn() },
  isUsable: jest.requireActual("@/lib/clients/database/tags").isUsable,
  hidePendingTags: jest.fn(),
}));
jest.mock("@/lib/api/authz", () => ({
  canListOnProfile: jest.fn(),
  isAdmin: jest.fn(),
  isAuthorized: jest.fn(),
}));
jest.mock("@/lib/actions/proxy-credentials", () => ({ getProxyCredentials: jest.fn() }));
jest.mock("@/lib/clients/storage", () => ({ getStorageClient: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const SESSION = { identity_id: "user-1", account: { account_id: "alice", flags: [] } } as never;

const product = (overrides: Record<string, unknown> = {}) =>
  ({
    account_id: "alice",
    product_id: "my-product",
    title: "My Product",
    description: "A description",
    visibility: "public",
    disabled: false,
    metadata: {
      primary_mirror: "conn-x",
      mirrors: { "conn-x": { connection_id: "conn-x", prefix: "", is_primary: true } },
    },
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
  (hidePendingTags as jest.Mock).mockImplementation(async (products) => products);
  (tagsTable.listAll as jest.Mock).mockResolvedValue([
    { tag_id: "acoustics" },
    { tag_id: "ocean" },
    { tag_id: "sea-ice", pending: true },
  ]);
});

describe("listProducts", () => {
  const key = { account_id: "alice", product_id: "b" };
  const encode = (k: unknown) => Buffer.from(JSON.stringify(k)).toString("base64url");
  const cursor = encode(key);

  test("pages through an account's products, showing only those the caller may", async () => {
    const [shown, hidden] = [product(), product({ product_id: "hidden" })];
    (productsTable.listByAccount as jest.Mock).mockResolvedValue({
      products: [shown, hidden],
      lastEvaluatedKey: key,
    });
    (canListOnProfile as jest.Mock).mockImplementation((_s, p) => p === shown);

    const result = await listProducts(SESSION, { limit: "10", cursor }, "alice");

    expect(productsTable.listByAccount).toHaveBeenCalledWith("alice", 10, key);
    expect(result).toEqual({
      ok: true,
      value: { items: [{ ...shown, account: { account_id: "alice" } }], next_cursor: cursor },
    });
  });

  test("shows an account's public profile to whoever may not read the account", async () => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue({
      account_id: "alice",
      name: "Alice",
      emails: [{ address: "alice@example.com" }],
      identity_id: "ory-alice",
      flags: ["admin"],
      metadata_private: { note: "secret" },
      metadata_public: { bio: "hi" },
    });
    (productsTable.listByAccount as jest.Mock).mockResolvedValue({ products: [product()] });
    (canListOnProfile as jest.Mock).mockReturnValue(true);
    allowExcept(Actions.GetAccount);

    const result = await listProducts(null, {}, "alice");

    expect(result.ok && result.value.items[0].account).toEqual({
      account_id: "alice",
      name: "Alice",
      metadata_public: { bio: "hi" },
    });
  });

  test("refuses an unfeatured cursor when listing featured products", async () => {
    (productsTable.listPublic as jest.Mock).mockResolvedValue({ products: [] });
    const unfeatured = encode({ ...key, visibility: "public", featured: 0 });
    expect(await listProducts(null, { featured: "true", cursor: unfeatured })).toMatchObject({
      error: "invalid",
    });
    expect(await listProducts(null, { cursor: unfeatured })).toMatchObject({ ok: true });
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

  test("filters on tags in the spelling they are stored in", async () => {
    (productsTable.listPublic as jest.Mock).mockResolvedValue({ products: [] });

    await listProducts(null, { tags: "New Zealand, #ocean,," });

    expect((productsTable.listPublic as jest.Mock).mock.calls[0][2].tags).toBe(
      "new-zealand,ocean"
    );
  });

  test("filtering by a pending tag doesn't reveal which products carry it", async () => {
    const tagged = product();
    tagged.metadata = { ...tagged.metadata, tags: ["ocean", "secret-project"] };
    (productsTable.listPublic as jest.Mock).mockResolvedValue({ products: [tagged] });
    // As for a caller who may not see the pending tag.
    (hidePendingTags as jest.Mock).mockImplementation(async (products) =>
      products.map((p: typeof tagged) => ({ ...p, metadata: { ...p.metadata, tags: ["ocean"] } }))
    );

    const hidden = await listProducts(null, { tags: "secret-project" });
    expect(hidden.ok && hidden.value.items).toEqual([]);
    const shown = await listProducts(null, { tags: "ocean" });
    expect(shown.ok && shown.value.items).toHaveLength(1);
  });

  test("hides public products the caller may not list", async () => {
    (productsTable.listPublic as jest.Mock).mockResolvedValue({ products: [product()] });
    allowExcept(Actions.ListRepository);
    const result = await listProducts(null, {});
    expect(result.ok && result.value.items).toEqual([]);
  });

  test.each([
    ["isn't JSON", undefined, "not base64 json"],
    ["is empty", undefined, encode({})],
    ["is an account listing's", undefined, encode(key)],
    ["is another account's", "bob", encode(key)],
    ["is the public listing's", "alice", encode({ ...key, visibility: "public", featured: 0 })],
  ])("refuses a cursor that %s", async (_, account, cursor) => {
    expect(await listProducts(null, { cursor }, account)).toMatchObject({
      error: "invalid",
      fieldErrors: { cursor: expect.any(Array) },
    });
    expect(productsTable.listPublic).not.toHaveBeenCalled();
    expect(productsTable.listByAccount).not.toHaveBeenCalled();
  });

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

  test("shows the whole account only to whoever may read it", async () => {
    const account = { account_id: "alice", name: "Alice", emails: [{ address: "a@b.c" }] };
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product({ account }));

    const mine = await getProduct(SESSION, "alice", "my-product");
    expect(mine.ok && mine.value.account).toEqual(account);

    allowExcept(Actions.GetAccount);
    const theirs = await getProduct(null, "alice", "my-product");
    expect(theirs.ok && theirs.value.account).toEqual({ account_id: "alice", name: "Alice" });
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

  test("hides pending tags from anyone who may not edit the product", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product());
    await getProduct(SESSION, "alice", "my-product");
    const keep = (hidePendingTags as jest.Mock).mock.calls[0][1];

    expect(keep(product())).toBe(true);
    allowExcept(Actions.PutRepository);
    expect(keep(product())).toBe(false);
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

  test("saves tags from the corpus, deduplicated", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection());
    const result = await createProduct(SESSION, input({ tags: ["ocean", "ocean"] }));
    expect(result.ok).toBe(true);
    const created = (productsTable.create as jest.Mock).mock.calls[0][0];
    expect(created.metadata.tags).toEqual(["ocean"]);
  });

  test("rejects a tag outside the corpus", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection());
    expect(
      await createProduct(SESSION, input({ tags: ["ocean", "made-up"] }))
    ).toMatchObject({
      error: "invalid",
      fieldErrors: { tags: ["Unknown tags: made-up"] },
    });
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("suggests new tags with the product, and only once every check passes", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection());
    const result = await createProduct(
      SESSION,
      input({ tags: ["ocean"], suggest_tags: ["Sea Lion", "acoustics"] })
    );
    expect(result.ok).toBe(true);
    // acoustics is already on the list, so only sea-lion is new.
    expect(tagsTable.suggest).toHaveBeenCalledTimes(1);
    expect(tagsTable.suggest).toHaveBeenCalledWith("sea-lion", "alice");
    expect((productsTable.create as jest.Mock).mock.calls[0][0].metadata.tags).toEqual([
      "ocean",
      "sea-lion",
      "acoustics",
    ]);
  });

  test("a save that fails suggests nothing", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection());
    expect(
      await createProduct(SESSION, input({ tags: ["made-up"], suggest_tags: ["sea-ice"] }))
    ).toMatchObject({ error: "invalid" });
    expect(
      await createProduct(SESSION, input({ suggest_tags: ["sea_ice"] }))
    ).toMatchObject({ error: "invalid", fieldErrors: { suggest_tags: expect.any(Array) } });
    expect(tagsTable.suggest).not.toHaveBeenCalled();
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("a product without tags never reads the tag table", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection());
    await createProduct(SESSION, input());
    expect((productsTable.create as jest.Mock).mock.calls[0][0].metadata.tags).toEqual([]);
    expect(tagsTable.listAll).not.toHaveBeenCalled();
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

  test("replaces the tags, keeping the rest of the metadata", async () => {
    const result = await updateProduct(SESSION, "alice", "my-product", {
      tags: ["ocean", "acoustics"],
    });
    expect(result.ok).toBe(true);
    const updated = (productsTable.update as jest.Mock).mock.calls[0][0];
    expect(updated.metadata).toEqual({
      ...product().metadata,
      tags: ["ocean", "acoustics"],
    });
  });

  test("accepts a tag that is still pending review", async () => {
    const result = await updateProduct(SESSION, "alice", "my-product", {
      tags: ["sea-ice"],
    });
    expect(result.ok).toBe(true);
    expect((productsTable.update as jest.Mock).mock.calls[0][0].metadata.tags).toEqual([
      "sea-ice",
    ]);
  });

  test("keeps a tag the product already has after the corpus drops it", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      product({ metadata: { primary_mirror: "conn-x", mirrors: {}, tags: ["legacy"] } })
    );
    const result = await updateProduct(SESSION, "alice", "my-product", {
      tags: ["legacy", "ocean"],
    });
    expect(result.ok).toBe(true);
    expect((productsTable.update as jest.Mock).mock.calls[0][0].metadata.tags).toEqual([
      "legacy",
      "ocean",
    ]);
  });

  test("reads a tag in its one spelling, but keeps the product's own as they are", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([
      { tag_id: "ocean" },
      { tag_id: "sea-ice" },
    ]);
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      product({
        metadata: { primary_mirror: "conn-x", mirrors: {}, tags: ["field boundaries"] },
      })
    );
    const result = await updateProduct(SESSION, "alice", "my-product", {
      tags: ["Sea  Ice", " OCEAN ", "field boundaries"],
    });
    expect(result.ok).toBe(true);
    expect((productsTable.update as jest.Mock).mock.calls[0][0].metadata.tags).toEqual([
      "sea-ice",
      "ocean",
      "field boundaries",
    ]);
  });

  test("keeps one tag per spelling, preferring the corpus's", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue([
      { tag_id: "sea-ice" },
      { tag_id: "machine learning" },
    ]);
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      product({ metadata: { primary_mirror: "conn-x", mirrors: {}, tags: ["sea ice"] } })
    );
    const result = await updateProduct(SESSION, "alice", "my-product", {
      tags: ["sea ice", "sea-ice", "Machine-Learning"],
    });
    expect(result.ok).toBe(true);
    expect((productsTable.update as jest.Mock).mock.calls[0][0].metadata.tags).toEqual([
      "sea-ice",
      "machine learning",
    ]);
  });

  test("rejects a tag outside the corpus", async () => {
    expect(
      await updateProduct(SESSION, "alice", "my-product", { tags: ["made-up"] })
    ).toMatchObject({ error: "invalid", fieldErrors: { tags: ["Unknown tags: made-up"] } });
    expect(productsTable.update).not.toHaveBeenCalled();
  });

  test("suggested tags join the product's own when `tags` is left out", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      product({ metadata: { primary_mirror: "conn-x", mirrors: {}, tags: ["ocean"] } })
    );
    const result = await updateProduct(SESSION, "alice", "my-product", {
      suggest_tags: ["sea lion"],
    });
    expect(result.ok).toBe(true);
    expect(tagsTable.suggest).toHaveBeenCalledWith("sea-lion", "alice");
    expect((productsTable.update as jest.Mock).mock.calls[0][0].metadata.tags).toEqual([
      "ocean",
      "sea-lion",
    ]);
  });

  test("a suggestion past the cap refuses the save", async () => {
    (tagsTable.listAll as jest.Mock).mockResolvedValue(
      ["a1", "a2", "a3", "a4", "a5"].map((tag_id) => ({
        tag_id,
        pending: true,
        suggested_by: "alice",
      }))
    );
    expect(
      await updateProduct(SESSION, "alice", "my-product", { suggest_tags: ["sea-lion"] })
    ).toMatchObject({ error: "conflict" });
    expect(tagsTable.suggest).not.toHaveBeenCalled();
    expect(productsTable.update).not.toHaveBeenCalled();
  });

  test("an empty list clears the tags; leaving the field out keeps them", async () => {
    const tagged = product({
      metadata: { primary_mirror: "conn-x", mirrors: {}, tags: ["ocean"] },
    });
    (productsTable.fetchById as jest.Mock).mockResolvedValue(tagged);

    await updateProduct(SESSION, "alice", "my-product", { tags: [] });
    expect((productsTable.update as jest.Mock).mock.calls[0][0].metadata.tags).toEqual([]);

    await updateProduct(SESSION, "alice", "my-product", { title: "New" });
    expect((productsTable.update as jest.Mock).mock.calls[1][0].metadata.tags).toEqual([
      "ocean",
    ]);
  });

  test("checks the primary mirror's connection on a product that keys it by another name", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      product({
        metadata: {
          primary_mirror: "aws-us-east-1",
          mirrors: {
            "aws-us-east-1": { connection_id: "conn-x", prefix: "", is_primary: true },
          },
        },
      })
    );
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection());
    expect(
      await updateProduct(SESSION, "alice", "my-product", { visibility: "restricted" })
    ).toMatchObject({ ok: true });
    expect(dataConnectionsTable.fetchById).toHaveBeenCalledWith("conn-x");
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

  test("leaves a field given as undefined, as an empty form field is, as it is", async () => {
    await updateProduct(SESSION, "alice", "my-product", { description: undefined });
    expect((productsTable.update as jest.Mock).mock.calls[0][0].description).toBe(
      "A description"
    );
  });

  test("a product with no ID is not found, without asking DynamoDB", async () => {
    expect(
      await updateProduct(SESSION, "alice", "", { visibility: "nope" })
    ).toMatchObject({ error: "not_found" });
    expect(productsTable.fetchById).not.toHaveBeenCalled();
  });

  test("answers with the row as written", async () => {
    (productsTable.update as jest.Mock).mockImplementation(async (p) => ({
      ...p,
      updated_at: "as stored",
    }));
    const result = await updateProduct(SESSION, "alice", "my-product", { title: "New" });
    expect(result.ok && result.value.updated_at).toBe("as stored");
  });

  test("refuses an empty title, which only the form may leave out", async () => {
    expect(await updateProduct(SESSION, "alice", "my-product", { title: " " })).toMatchObject({
      error: "invalid",
      fieldErrors: { title: ["A title is required"] },
    });
  });

  test("answers with the product as GET does, and drops its cached pages", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      product({ account: { account_id: "alice" } })
    );
    const result = await updateProduct(SESSION, "alice", "my-product", { title: "New" });
    expect(result.ok && result.value).toMatchObject({ title: "New", account: { account_id: "alice" } });
    expect(revalidatePath).toHaveBeenCalledWith("/alice/my-product");
  });

  test("a deactivated product the caller can't see is not found, not forbidden", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product({ disabled: true }));
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect(await updateProduct(SESSION, "alice", "my-product", {})).toMatchObject({
      error: "not_found",
    });
    expect(await deleteProduct(SESSION, "alice", "my-product", {})).toMatchObject({
      error: "not_found",
    });
  });

  test("refuses whoever may not edit the product before reading the body", async () => {
    allowExcept(Actions.PutRepository);
    expect(
      await updateProduct(SESSION, "alice", "my-product", { visibility: "nope" })
    ).toMatchObject({ error: "forbidden" });
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

    // Minted for the verified session identity, not request params.
    expect(getProxyCredentials).toHaveBeenCalledWith("user-1");
    expect(deleteByPrefix).toHaveBeenCalledWith("alice", "my-product/");
    expect(membershipsTable.deleteByProduct).toHaveBeenCalledWith("alice", "my-product");
    expect(productsTable.delete).toHaveBeenCalledWith("alice", "my-product");
    expect(revalidatePath).toHaveBeenCalledWith("/alice");
  });

  test("deletes a product with no metadata, which has no objects to delete", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product({ metadata: undefined }));
    expect(await deleteProduct(SESSION, "alice", "my-product", {})).toMatchObject({ ok: true });
    expect(getStorageClient).not.toHaveBeenCalled();
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

  test("refuses to delete stored objects for a caller with no identity", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue({ read_only: false });
    const bot = { identity_id: null, account: { account_id: "alice--bot" } } as never;
    expect(await deleteProduct(bot, "alice", "my-product", {})).toMatchObject({
      error: "forbidden",
    });
    expect(productsTable.delete).not.toHaveBeenCalled();
  });

  test("a product with no ID is not found, without asking DynamoDB", async () => {
    expect(await deleteProduct(SESSION, "alice", "", { preserve_data: "1" })).toMatchObject({
      error: "not_found",
    });
    expect(productsTable.fetchById).not.toHaveBeenCalled();
  });

  test("refuses whoever may not delete the product before reading the query", async () => {
    allowExcept(Actions.DeleteRepository);
    expect(
      await deleteProduct(SESSION, "alice", "my-product", { preserve_data: "1" })
    ).toMatchObject({ error: "forbidden" });
  });

  test("refuses a preserve_data that isn't true or false", async () => {
    expect(
      await deleteProduct(SESSION, "alice", "my-product", { preserve_data: "1" })
    ).toMatchObject({ error: "invalid" });
  });
});

// The data proxy reads this as a bare list, and gates writes on "write".
describe("getProductPermissions", () => {
  test("lists what the caller may do", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product());
    expect(await getProductPermissions(SESSION, "alice", "my-product")).toEqual({
      ok: true,
      value: ["write", "read"],
    });
    allowExcept(Actions.WriteRepositoryData);
    expect(await getProductPermissions(null, "alice", "my-product")).toEqual({
      ok: true,
      value: ["read"],
    });
  });

  test("refuses a caller who may not read the product, as viewing it would", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product({ visibility: "restricted" }));
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect(await getProductPermissions(null, "alice", "my-product")).toMatchObject({
      error: "unauthenticated",
    });
    expect(await getProductPermissions(SESSION, "alice", "my-product")).toMatchObject({
      error: "forbidden",
    });
  });

  test("hides a deactivated product from a caller who may not see it", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(product({ disabled: true }));
    (isAuthorized as jest.Mock).mockReturnValue(false);
    expect(await getProductPermissions(SESSION, "alice", "my-product")).toMatchObject({
      error: "not_found",
    });
  });

  test("reports a missing product", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(null);
    expect(await getProductPermissions(null, "alice", "gone")).toMatchObject({
      error: "not_found",
    });
  });
});
