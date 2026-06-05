/** @jest-environment node */
import { Actions } from "@/types";
import { productsTable, dataConnectionsTable } from "@/lib/clients/database";
import { getPageSession } from "@/lib";
import { isAuthorized } from "@/lib/api/authz";
import { redirect } from "next/navigation";

jest.mock("@/lib/clients/database", () => ({
  productsTable: { create: jest.fn() },
  dataConnectionsTable: { fetchById: jest.fn() },
}));

jest.mock("@/lib", () => ({
  getPageSession: jest.fn(),
  LOGGER: { error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/urls", () => ({
  productUrl: jest.fn(() => "/account/product"),
  editProductDetailsUrl: jest.fn(() => "/edit"),
}));

const { createProduct } = require("./products");

const SESSION = {
  identity_id: "user-1",
  account: { account_id: "alice", flags: [] },
};

function buildFormData(
  overrides: Record<string, string> = {}
): FormData {
  const fd = new FormData();
  fd.set("title", "My Product");
  fd.set("account_id", "alice");
  fd.set("product_id", "my-product");
  fd.set("description", "A description");
  fd.set("visibility", "public");
  fd.set("data_connection_id", "conn-x");
  for (const [key, value] of Object.entries(overrides)) {
    fd.set(key, value);
  }
  return fd;
}

function connection(overrides: Record<string, unknown> = {}) {
  return {
    data_connection_id: "conn-x",
    name: "Test Connection",
    read_only: false,
    allowed_visibilities: ["public", "restricted"],
    details: { provider: "s3", bucket: "b", base_prefix: "", region: "us-west-2" },
    ...overrides,
  };
}

describe("createProduct", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (getPageSession as jest.Mock).mockResolvedValue(SESSION);
    (isAuthorized as jest.Mock).mockReturnValue(true);
  });

  test("builds mirror metadata from the selected data connection", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection()
    );

    await createProduct(undefined, buildFormData());

    expect(productsTable.create).toHaveBeenCalledTimes(1);
    const created = (productsTable.create as jest.Mock).mock.calls[0][0];
    expect(created.metadata.primary_mirror).toBe("conn-x");
    expect(created.metadata.mirrors["conn-x"]).toMatchObject({
      storage_type: "s3",
      connection_id: "conn-x",
      prefix: "alice/my-product/",
      is_primary: true,
    });
    expect(redirect).toHaveBeenCalled();
  });

  test("rejects a visibility not allowed by the data connection", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection({ allowed_visibilities: ["public"] })
    );

    const result = await createProduct(
      undefined,
      buildFormData({ visibility: "restricted" })
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors.visibility).toBeDefined();
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("rejects when the data connection does not exist", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(null);

    const result = await createProduct(undefined, buildFormData());

    expect(result.success).toBe(false);
    expect(result.fieldErrors.data_connection_id).toBeDefined();
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("rejects when the user may not use the data connection", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection()
    );
    (isAuthorized as jest.Mock).mockImplementation(
      (_session, _resource, action) => action !== Actions.UseDataConnection
    );

    const result = await createProduct(undefined, buildFormData());

    expect(result.success).toBe(false);
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("rejects when no data connection is selected", async () => {
    const result = await createProduct(
      undefined,
      buildFormData({ data_connection_id: "" })
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors.data_connection_id).toBeDefined();
    expect(dataConnectionsTable.fetchById).not.toHaveBeenCalled();
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("rejects when the connection is owned by a different account", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection({ owner: "org-other" })
    );

    const result = await createProduct(
      undefined,
      buildFormData({ account_id: "alice" })
    );

    expect(result.success).toBe(false);
    expect(result.fieldErrors.data_connection_id).toBeDefined();
    expect(productsTable.create).not.toHaveBeenCalled();
  });

  test("allows a connection owned by the same account", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection({ owner: "alice" })
    );

    await createProduct(undefined, buildFormData({ account_id: "alice" }));

    expect(productsTable.create).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalled();
  });

  test("allows an unowned (Source-Coop-managed) connection for any account", async () => {
    (dataConnectionsTable.fetchById as jest.Mock).mockResolvedValue(
      connection({ owner: undefined })
    );

    await createProduct(undefined, buildFormData({ account_id: "alice" }));

    expect(productsTable.create).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalled();
  });
});
