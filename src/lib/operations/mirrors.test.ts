/** @jest-environment node */
import { Product, ProductMirror } from "@/types";
import {
  accountsTable,
  dataConnectionsTable,
  productsTable,
} from "@/lib/clients/database";
import { canManageAccount, isAdmin } from "@/lib/api/authz";
import {
  canManageDataConnection,
  denyDataConnectionFor,
} from "@/lib/data-connections";
import { getProduct } from "./products";
import { addMirror, listMirrors, removeMirror, updateMirror } from "./mirrors";

jest.mock("@/lib/clients/database", () => ({
  accountsTable: { fetchById: jest.fn() },
  productsTable: { fetchById: jest.fn(), update: jest.fn() },
  dataConnectionsTable: { fetchById: jest.fn() },
}));
jest.mock("@/lib/api/authz", () => ({ canManageAccount: jest.fn(), isAdmin: jest.fn() }));
jest.mock("@/lib/data-connections", () => ({
  canManageDataConnection: jest.fn(),
  denyDataConnectionFor: jest.fn(),
}));
jest.mock("./products", () => ({ getProduct: jest.fn(), revalidate: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const SESSION = { identity_id: "user-1", account: { account_id: "alice" } } as never;

const mirror = (connection_id: string, is_primary = false): ProductMirror => ({
  connection_id,
  prefix: `acct/prod/`,
  is_primary,
});

const productWith = (
  mirrors: Record<string, ProductMirror>,
  primary_mirror = ""
) =>
  ({
    account_id: "acct",
    product_id: "prod",
    updated_at: "2026-01-01T00:00:00Z",
    metadata: { mirrors, primary_mirror },
  }) as unknown as Product;

const TWO = () =>
  productWith({ a: mirror("a", true), b: mirror("b") }, "a");

/** The product as last written. */
const written = () =>
  (productsTable.update as jest.Mock).mock.calls[0][0] as Product;

beforeEach(() => {
  jest.resetAllMocks();
  (accountsTable.fetchById as jest.Mock).mockResolvedValue({ account_id: "acct" });
  (canManageAccount as jest.Mock).mockReturnValue(true);
  (canManageDataConnection as jest.Mock).mockResolvedValue(true);
  (denyDataConnectionFor as jest.Mock).mockReturnValue(null);
  (dataConnectionsTable.fetchById as jest.Mock).mockImplementation(async (id) => ({
    data_connection_id: id,
    owner: "acct",
    prefix_template: "{{repository.account_id}}/{{repository.repository_id}}/",
  }));
  (productsTable.update as jest.Mock).mockImplementation(async (p) => p);
});

describe("account gate", () => {
  const each = test.each([
    ["addMirror", () => addMirror(SESSION, "acct", "prod", { connection_id: "c" })],
    ["updateMirror", () => updateMirror(SESSION, "acct", "prod", "a", { is_primary: true })],
    ["removeMirror", () => removeMirror(SESSION, "acct", "prod", "a")],
  ]);

  each("%s refuses a caller who doesn't manage the owning account, before reading the product", async (_n, run) => {
    // A membership of this one product doesn't reach the account's storage.
    (canManageAccount as jest.Mock).mockReturnValue(false);
    expect(await run()).toMatchObject({ ok: false, error: "forbidden" });
    expect(productsTable.fetchById).not.toHaveBeenCalled();
  });

  each("%s refuses when the owning account doesn't exist", async (_n, run) => {
    (accountsTable.fetchById as jest.Mock).mockResolvedValue(null);
    expect(await run()).toMatchObject({ ok: false, error: "forbidden" });
  });

  test("asks for credentials when there's no session", async () => {
    expect(await removeMirror(null, "acct", "prod", "a")).toMatchObject({
      error: "unauthenticated",
    });
  });

  test("a missing product is a 404 to an account manager", async () => {
    expect(await removeMirror(SESSION, "acct", "prod", "a")).toMatchObject({
      error: "not_found",
    });
  });
});

describe("listMirrors", () => {
  test("lists the mirrors, with their keys, of a product the caller may read", async () => {
    (getProduct as jest.Mock).mockResolvedValue({ ok: true, value: TWO() });
    expect(await listMirrors(null, "acct", "prod")).toEqual({
      ok: true,
      value: [
        { key: "a", ...mirror("a", true) },
        { key: "b", ...mirror("b") },
      ],
    });
  });

  test("refuses as reading the product would", async () => {
    const refusal = { ok: false, error: "forbidden", message: "no" };
    (getProduct as jest.Mock).mockResolvedValue(refusal);
    expect(await listMirrors(SESSION, "acct", "prod")).toBe(refusal);
  });
});

describe("addMirror", () => {
  test("the first mirror becomes primary, at the template's prefix", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(productWith({}));
    const result = await addMirror(SESSION, "acct", "prod", { connection_id: "c" });
    expect(result).toEqual({
      ok: true,
      value: { key: "c", connection_id: "c", prefix: "acct/prod/", is_primary: true },
    });
    expect(written().metadata.primary_mirror).toBe("c");
    expect(productsTable.update).toHaveBeenCalledWith(expect.anything(), {
      expectedUpdatedAt: "2026-01-01T00:00:00Z",
    });
  });

  test("a later mirror leaves the primary alone", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(TWO());
    await addMirror(SESSION, "acct", "prod", { connection_id: "c" });
    expect(written().metadata.primary_mirror).toBe("a");
    expect(written().metadata.mirrors.c.is_primary).toBe(false);
  });

  test("an empty prefix template mirrors at the connection root", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(productWith({}));
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue({ prefix_template: "" });
    await addMirror(SESSION, "acct", "prod", { connection_id: "c" });
    expect(written().metadata.mirrors.c.prefix).toBe("");
  });

  test.each([
    ["no connection_id", {}, null, "invalid"],
    ["a connection that doesn't exist", { connection_id: "c" }, "missing", "invalid"],
    ["a connection another account owns", { connection_id: "c" }, "wrong-account", "invalid"],
    ["a connection the caller may not use", { connection_id: "c" }, "not-usable", "forbidden"],
    ["a connection already mirrored", { connection_id: "a" }, null, "conflict"],
    ["a connection mirrored under an older key", { connection_id: "old" }, "legacy", "conflict"],
  ])("refuses %s", async (_n, input, denial, error) => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      denial === "legacy"
        ? productWith({ "aws-us-east-1": mirror("old", true) }, "aws-us-east-1")
        : TWO()
    );
    if (denial === "missing") {
      (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(null);
    } else if (denial !== "legacy") {
      (denyDataConnectionFor as jest.Mock).mockReturnValue(denial);
    }
    expect(await addMirror(SESSION, "acct", "prod", input)).toMatchObject({ error });
    expect(productsTable.update).not.toHaveBeenCalled();
  });

  test("a write that loses a race is a conflict", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(productWith({}));
    (productsTable.update as jest.Mock).mockRejectedValue(
      Object.assign(new Error("x"), { name: "ConditionalCheckFailedException" })
    );
    expect(await addMirror(SESSION, "acct", "prod", { connection_id: "c" })).toMatchObject({
      error: "conflict",
      message: expect.stringContaining("modified by someone else"),
    });
  });

  test("any other failure is thrown", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(productWith({}));
    (productsTable.update as jest.Mock).mockRejectedValue(new Error("boom"));
    await expect(
      addMirror(SESSION, "acct", "prod", { connection_id: "c" })
    ).rejects.toThrow("boom");
  });
});

describe("updateMirror", () => {
  beforeEach(() => (productsTable.fetchById as jest.Mock).mockResolvedValue(TWO()));

  test("promoting a mirror moves is_primary to it alone", async () => {
    const result = await updateMirror(SESSION, "acct", "prod", "b", { is_primary: true });
    expect(result).toMatchObject({ ok: true, value: { key: "b", is_primary: true } });
    expect(written().metadata.primary_mirror).toBe("b");
    expect(written().metadata.mirrors.a.is_primary).toBe(false);
  });

  test.each([
    ["new/prefix", "new/prefix/"],
    ["  new/prefix/  ", "new/prefix/"],
    ["", ""],
  ])("sets the prefix %j as %j, leaving the rest", async (prefix, stored) => {
    await updateMirror(SESSION, "acct", "prod", "b", { prefix });
    expect(written().metadata.mirrors.b).toEqual({ ...mirror("b"), prefix: stored });
    expect(written().metadata.mirrors.a).toEqual(mirror("a", true));
    expect(written().metadata.primary_mirror).toBe("a");
  });

  test.each(["/abs", "a/../b"])("refuses the prefix %j", async (prefix) => {
    expect(await updateMirror(SESSION, "acct", "prod", "b", { prefix })).toMatchObject({
      error: "invalid",
      fieldErrors: { prefix: [expect.any(String)] },
    });
  });

  test("refuses to un-primary a mirror, which would leave none", async () => {
    expect(
      await updateMirror(SESSION, "acct", "prod", "a", { is_primary: false })
    ).toMatchObject({ error: "invalid" });
  });

  test("refuses an edit that changes nothing, before writing", async () => {
    expect(await updateMirror(SESSION, "acct", "prod", "b", {})).toMatchObject({
      error: "invalid",
    });
    expect(productsTable.update).not.toHaveBeenCalled();
  });

  test("a prefix also needs management of the connection", async () => {
    (canManageDataConnection as jest.Mock).mockResolvedValue(false);
    expect(await updateMirror(SESSION, "acct", "prod", "b", { prefix: "x" })).toMatchObject({
      error: "forbidden",
    });
    // Promoting doesn't.
    expect(
      await updateMirror(SESSION, "acct", "prod", "b", { is_primary: true })
    ).toMatchObject({ ok: true });
  });

  test("refuses a prefix on a mirror whose connection is gone", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(null);
    expect(await updateMirror(SESSION, "acct", "prod", "b", { prefix: "x" })).toMatchObject({
      error: "forbidden",
    });
  });

  test.each(["missing", "constructor", "__proto__"])("%s is not a mirror", async (key) => {
    expect(
      await updateMirror(SESSION, "acct", "prod", key, { is_primary: true })
    ).toMatchObject({ error: "not_found" });
  });
});

describe("removeMirror", () => {
  test("removing the primary promotes the next", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(TWO());
    const result = await removeMirror(SESSION, "acct", "prod", "a");
    expect(result).toEqual({ ok: true, value: { key: "a", ...mirror("a", true) } });
    expect(written().metadata).toEqual({
      mirrors: { b: { ...mirror("b"), is_primary: true } },
      primary_mirror: "b",
    });
  });

  test("removing the last mirror clears the primary", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(
      productWith({ a: mirror("a", true) }, "a")
    );
    await removeMirror(SESSION, "acct", "prod", "a");
    expect(written().metadata).toEqual({ mirrors: {}, primary_mirror: "" });
  });

  test("removing another leaves the primary", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(TWO());
    await removeMirror(SESSION, "acct", "prod", "b");
    expect(written().metadata).toEqual({
      mirrors: { a: mirror("a", true) },
      primary_mirror: "a",
    });
  });

  test.each([
    ["refuses", "a Source-managed mirror, for a non-admin", { read_only: false }, false, "forbidden"],
    ["allows", "a Source-managed mirror, for an admin", { read_only: false }, true, undefined],
    ["allows", "a read-only mirror", { read_only: true }, false, undefined],
    ["allows", "a mirror whose connection is gone", null, false, undefined],
  ])("%s removing %s", async (_v, _n, connection, admin, error) => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(TWO());
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(connection);
    (isAdmin as jest.Mock).mockReturnValue(admin);
    const result = await removeMirror(SESSION, "acct", "prod", "b");
    expect(result.ok).toBe(!error);
    if (error) {
      expect(result).toMatchObject({ error });
      expect(productsTable.update).not.toHaveBeenCalled();
    }
  });

  test("__proto__ is not a mirror", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(TWO());
    expect(await removeMirror(SESSION, "acct", "prod", "__proto__")).toMatchObject({
      error: "not_found",
    });
  });
});
