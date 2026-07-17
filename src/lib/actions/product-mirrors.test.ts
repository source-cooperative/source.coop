import {
  addProductMirror,
  removeProductMirror,
  setPrimaryMirror,
  updateMirrorPrefix,
} from "./product-mirrors";
import { productsTable, dataConnectionsTable } from "../clients";
import { getPageSession } from "../api/utils";
import { isAdmin, isAuthorized } from "../api/authz";
import { DataConnection, Product, ProductMirror } from "@/types";

jest.mock("../clients", () => ({
  productsTable: {
    fetchById: jest.fn(),
    update: jest.fn(),
  },
  dataConnectionsTable: {
    fetchById: jest.fn(),
  },
}));

jest.mock("../api/utils", () => ({
  getPageSession: jest.fn(),
}));

jest.mock("../api/authz", () => ({
  isAdmin: jest.fn(),
  isAuthorized: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockProductsTable = productsTable as jest.Mocked<typeof productsTable>;
const mockDataConnectionsTable = dataConnectionsTable as jest.Mocked<
  typeof dataConnectionsTable
>;
const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
const mockIsAuthorized = isAuthorized as jest.MockedFunction<
  typeof isAuthorized
>;

const FORM_STATE = {
  message: "",
  data: new FormData(),
  fieldErrors: {},
  success: false,
};

function formDataFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

function mirror(overrides: Partial<ProductMirror>): ProductMirror {
  return {
    storage_type: "s3",
    connection_id: "conn",
    prefix: "acct/prod/",
    is_primary: false,
    ...overrides,
  };
}

function productWith(
  mirrors: Record<string, ProductMirror>,
  primary_mirror: string
): Product {
  return {
    account_id: "acct",
    product_id: "prod",
    metadata: { mirrors, primary_mirror },
  } as Product;
}

const s3Connection = {
  data_connection_id: "conn-a",
  prefix_template: "{{repository.account_id}}/{{repository.repository_id}}/",
  details: { provider: "s3" },
} as DataConnection;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPageSession.mockResolvedValue({
    identity_id: "id-1",
  } as Awaited<ReturnType<typeof getPageSession>>);
  mockIsAdmin.mockReturnValue(true);
  mockIsAuthorized.mockReturnValue(true);
  mockProductsTable.update.mockImplementation(async (p) => p);
  mockDataConnectionsTable.fetchById.mockResolvedValue(s3Connection);
});

describe("addProductMirror", () => {
  test("rejects non-admins before any write", async () => {
    mockIsAdmin.mockReturnValue(false);

    const result = await addProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        connection_id: "conn-a",
      })
    );

    expect(result.success).toBe(false);
    expect(mockProductsTable.update).not.toHaveBeenCalled();
  });

  test("the first mirror becomes primary", async () => {
    mockProductsTable.fetchById.mockResolvedValue(productWith({}, ""));

    const result = await addProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        connection_id: "conn-a",
      })
    );

    expect(result.success).toBe(true);
    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.primary_mirror).toBe("conn-a");
    expect(updated.metadata.mirrors["conn-a"]).toMatchObject({
      storage_type: "s3",
      connection_id: "conn-a",
      prefix: "acct/prod/",
      is_primary: true,
    });
  });

  test("passes the read updated_at as an optimistic lock and reports conflicts", async () => {
    mockProductsTable.fetchById.mockResolvedValue({
      ...productWith({}, ""),
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    const conflict = new Error("stale write");
    conflict.name = "ConditionalCheckFailedException";
    mockProductsTable.update.mockRejectedValueOnce(conflict);

    const result = await addProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        connection_id: "conn-a",
      })
    );

    expect(mockProductsTable.update.mock.calls[0][1]).toEqual({
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/modified by someone else/i);
  });

  test("an empty prefix template mirrors at the root (no prefix)", async () => {
    mockProductsTable.fetchById.mockResolvedValue(productWith({}, ""));
    mockDataConnectionsTable.fetchById.mockResolvedValue({
      data_connection_id: "conn-a",
      details: { provider: "s3" },
    } as DataConnection);

    await addProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        connection_id: "conn-a",
      })
    );

    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.mirrors["conn-a"].prefix).toBe("");
  });

  test("maps a GCP connection to the gcs storage type", async () => {
    mockProductsTable.fetchById.mockResolvedValue(productWith({}, ""));
    mockDataConnectionsTable.fetchById.mockResolvedValue({
      data_connection_id: "conn-a",
      prefix_template: "{{repository.account_id}}/{{repository.repository_id}}/",
      details: { provider: "gcp" },
    } as DataConnection);

    await addProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        connection_id: "conn-a",
      })
    );

    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.mirrors["conn-a"].storage_type).toBe("gcs");
  });

  test("a second mirror does not become primary", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith(
        { "conn-x": mirror({ connection_id: "conn-x", is_primary: true }) },
        "conn-x"
      )
    );

    await addProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        connection_id: "conn-a",
      })
    );

    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.primary_mirror).toBe("conn-x");
    expect(updated.metadata.mirrors["conn-a"].is_primary).toBe(false);
  });

  test("rejects a duplicate connection", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith({ "conn-a": mirror({ connection_id: "conn-a" }) }, "conn-a")
    );

    const result = await addProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        connection_id: "conn-a",
      })
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("already associated");
    expect(mockProductsTable.update).not.toHaveBeenCalled();
  });
});

describe("removeProductMirror", () => {
  test("removing the primary promotes a remaining mirror", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith(
        {
          "conn-a": mirror({ connection_id: "conn-a", is_primary: true }),
          "conn-b": mirror({ connection_id: "conn-b", is_primary: false }),
        },
        "conn-a"
      )
    );

    const result = await removeProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        mirror_key: "conn-a",
      })
    );

    expect(result.success).toBe(true);
    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.mirrors["conn-a"]).toBeUndefined();
    expect(updated.metadata.primary_mirror).toBe("conn-b");
    expect(updated.metadata.mirrors["conn-b"].is_primary).toBe(true);
  });

  test("removing the last mirror clears the primary", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith(
        { "conn-a": mirror({ connection_id: "conn-a", is_primary: true }) },
        "conn-a"
      )
    );

    const result = await removeProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        mirror_key: "conn-a",
      })
    );

    expect(result.success).toBe(true);
    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.mirrors).toEqual({});
    expect(updated.metadata.primary_mirror).toBe("");
  });

  test("removing a non-primary leaves the primary untouched", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith(
        {
          "conn-a": mirror({ connection_id: "conn-a", is_primary: true }),
          "conn-b": mirror({ connection_id: "conn-b", is_primary: false }),
        },
        "conn-a"
      )
    );

    await removeProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        mirror_key: "conn-b",
      })
    );

    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.primary_mirror).toBe("conn-a");
    expect(updated.metadata.mirrors["conn-a"].is_primary).toBe(true);
  });
});

describe("setPrimaryMirror", () => {
  test("flips is_primary across all mirrors", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith(
        {
          "conn-a": mirror({ connection_id: "conn-a", is_primary: true }),
          "conn-b": mirror({ connection_id: "conn-b", is_primary: false }),
        },
        "conn-a"
      )
    );

    const result = await setPrimaryMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        mirror_key: "conn-b",
      })
    );

    expect(result.success).toBe(true);
    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.primary_mirror).toBe("conn-b");
    expect(updated.metadata.mirrors["conn-a"].is_primary).toBe(false);
    expect(updated.metadata.mirrors["conn-b"].is_primary).toBe(true);
  });
});

describe("updateMirrorPrefix", () => {
  test("rejects callers without PutRepository before any write", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith({ "conn-a": mirror({ connection_id: "conn-a" }) }, "conn-a")
    );
    mockIsAuthorized.mockReturnValue(false);

    const result = await updateMirrorPrefix(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        mirror_key: "conn-a",
        prefix: "new/prefix/",
      })
    );

    expect(result.success).toBe(false);
    expect(mockProductsTable.update).not.toHaveBeenCalled();
  });

  test("updates the mirror's prefix, leaving the rest intact", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith(
        {
          "conn-a": mirror({ connection_id: "conn-a", is_primary: true }),
          "conn-b": mirror({ connection_id: "conn-b" }),
        },
        "conn-a"
      )
    );

    const result = await updateMirrorPrefix(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        mirror_key: "conn-a",
        prefix: "new/prefix/",
      })
    );

    expect(result.success).toBe(true);
    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.mirrors["conn-a"]).toMatchObject({
      prefix: "new/prefix/",
      is_primary: true,
    });
    expect(updated.metadata.mirrors["conn-b"].prefix).toBe("acct/prod/");
  });

  test("rejects a blank prefix", async () => {
    const result = await updateMirrorPrefix(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        mirror_key: "conn-a",
        prefix: "   ",
      })
    );

    expect(result.success).toBe(false);
    expect(mockProductsTable.update).not.toHaveBeenCalled();
  });
});
