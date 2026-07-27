import {
  addProductMirror,
  removeProductMirror,
  setPrimaryMirror,
  updateMirrorPrefix,
} from "./product-mirrors";
import { accountsTable, productsTable, dataConnectionsTable } from "../clients";
import { getPageSession } from "../api/utils";
import { canManageAccount, isAuthorized } from "../api/authz";
import {
  canManageDataConnection,
  canUseDataConnectionFor,
} from "@/lib/data-connections";
import { Account, DataConnection, Product, ProductMirror } from "@/types";

jest.mock("../clients", () => ({
  accountsTable: { fetchById: jest.fn() },
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
  canManageAccount: jest.fn(),
  isAuthorized: jest.fn(),
}));

jest.mock("@/lib/data-connections", () => ({
  canManageDataConnection: jest.fn(),
  canUseDataConnectionFor: jest.fn(),
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
const mockAccountsTable = accountsTable as jest.Mocked<typeof accountsTable>;
const mockCanManageAccount = canManageAccount as jest.MockedFunction<
  typeof canManageAccount
>;
const mockCanUseDataConnectionFor =
  canUseDataConnectionFor as jest.MockedFunction<typeof canUseDataConnectionFor>;
const mockIsAuthorized = isAuthorized as jest.MockedFunction<
  typeof isAuthorized
>;
const mockCanManageDataConnection =
  canManageDataConnection as jest.MockedFunction<
    typeof canManageDataConnection
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
  mockAccountsTable.fetchById.mockResolvedValue({
    account_id: "acct",
  } as Account);
  mockCanManageAccount.mockReturnValue(true);
  mockCanUseDataConnectionFor.mockReturnValue(true);
  mockIsAuthorized.mockReturnValue(true);
  mockCanManageDataConnection.mockResolvedValue(true);
  mockProductsTable.update.mockImplementation(async (p) => p);
  mockDataConnectionsTable.fetchById.mockResolvedValue(s3Connection);
});

describe("addProductMirror", () => {
  test("rejects a caller who does not manage the owning account", async () => {
    mockCanManageAccount.mockReturnValue(false);

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

  test("derives a mirror's storage_type from the connection provider", async () => {
    mockProductsTable.fetchById.mockResolvedValue(productWith({}, ""));
    mockDataConnectionsTable.fetchById.mockResolvedValue({
      data_connection_id: "conn-a",
      prefix_template: "{{repository.account_id}}/{{repository.repository_id}}/",
      details: { provider: "gcs" },
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

  test("rejects a product manager who can't manage the connection", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith({ "conn-a": mirror({ connection_id: "conn-a" }) }, "conn-a")
    );
    mockIsAuthorized.mockReturnValue(true); // product side OK
    mockCanManageDataConnection.mockResolvedValue(false); // connection side denied

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
    expect(result.message).toMatch(/both the product and the data connection/i);
    expect(mockProductsTable.update).not.toHaveBeenCalled();
  });

  test("rejects when the mirror's connection no longer exists", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith({ "conn-a": mirror({ connection_id: "conn-a" }) }, "conn-a")
    );
    mockDataConnectionsTable.fetchById.mockResolvedValue(null);

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

  test("accepts a blank prefix, mirroring at the connection root", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith({ "conn-a": mirror({ connection_id: "conn-a" }) }, "conn-a")
    );

    const result = await updateMirrorPrefix(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        mirror_key: "conn-a",
        prefix: "   ",
      })
    );

    expect(result.success).toBe(true);
    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.mirrors["conn-a"].prefix).toBe("");
  });

  test("appends a trailing slash so prefixes are directory boundaries", async () => {
    mockProductsTable.fetchById.mockResolvedValue(
      productWith({ "conn-a": mirror({ connection_id: "conn-a" }) }, "conn-a")
    );

    const result = await updateMirrorPrefix(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        mirror_key: "conn-a",
        prefix: "acct/prod", // no trailing slash
      })
    );

    expect(result.success).toBe(true);
    const updated = mockProductsTable.update.mock.calls[0][0];
    expect(updated.metadata.mirrors["conn-a"].prefix).toBe("acct/prod/");
  });

  test.each(["/acct/prod", "acct/../other", ".."])(
    "rejects an unsafe prefix %p before any write",
    async (prefix) => {
      mockProductsTable.fetchById.mockResolvedValue(
        productWith({ "conn-a": mirror({ connection_id: "conn-a" }) }, "conn-a")
      );

      const result = await updateMirrorPrefix(
        FORM_STATE,
        formDataFor({
          account_id: "acct",
          product_id: "prod",
          mirror_key: "conn-a",
          prefix,
        })
      );

      expect(result.success).toBe(false);
      expect(mockProductsTable.update).not.toHaveBeenCalled();
    }
  );
});

// Regression: https://github.com/source-cooperative/source.coop/issues/461
//
// BYOB — an org owns a data connection and a product, and an owner/maintainer of
// that org associates the two. Managing a product's mirrors is gated on
// administering the *owning account*, not on PutRepository (which a membership
// scoped to a single product also satisfies).
describe("issue #461: an org owner manages their product's mirrors", () => {
  // Non-admin org owner/maintainer: manages the account, not necessarily the
  // connection itself.
  const asAccountManager = () => {
    mockCanManageAccount.mockReturnValue(true);
    mockCanManageDataConnection.mockResolvedValue(false);
  };

  test("adds a connection available to the account", async () => {
    asAccountManager();
    mockProductsTable.fetchById.mockResolvedValue(productWith({}, ""));
    mockDataConnectionsTable.fetchById.mockResolvedValue({
      ...s3Connection,
      owner: "acct",
    } as DataConnection);

    const result = await addProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        connection_id: "conn-a",
      })
    );

    expect(result.success).toBe(true);
    expect(mockCanUseDataConnectionFor).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ owner: "acct" }),
      "acct"
    );
    expect(
      mockProductsTable.update.mock.calls[0][0].metadata.mirrors["conn-a"]
    ).toMatchObject({ connection_id: "conn-a", is_primary: true });
  });

  test("removes a mirror", async () => {
    asAccountManager();
    mockProductsTable.fetchById.mockResolvedValue(
      productWith(
        { "conn-a": mirror({ connection_id: "conn-a", is_primary: true }) },
        "conn-a"
      )
    );

    const result = await removeProductMirror(
      FORM_STATE,
      formDataFor({ account_id: "acct", product_id: "prod", mirror_key: "conn-a" })
    );

    expect(result.success).toBe(true);
    expect(mockProductsTable.update).toHaveBeenCalled();
  });

  test("promotes a mirror to primary", async () => {
    asAccountManager();
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
      formDataFor({ account_id: "acct", product_id: "prod", mirror_key: "conn-b" })
    );

    expect(result.success).toBe(true);
    expect(mockProductsTable.update.mock.calls[0][0].metadata.primary_mirror).toBe(
      "conn-b"
    );
  });

  test("refuses a connection unavailable to the account", async () => {
    asAccountManager();
    mockCanUseDataConnectionFor.mockReturnValue(false);
    mockProductsTable.fetchById.mockResolvedValue(productWith({}, ""));
    mockDataConnectionsTable.fetchById.mockResolvedValue({
      ...s3Connection,
      owner: "someone-else",
    } as DataConnection);

    const result = await addProductMirror(
      FORM_STATE,
      formDataFor({
        account_id: "acct",
        product_id: "prod",
        connection_id: "conn-a",
      })
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("not available for this account");
    expect(mockProductsTable.update).not.toHaveBeenCalled();
  });

  test.each([
    ["addProductMirror", addProductMirror, { connection_id: "conn-a" }],
    ["removeProductMirror", removeProductMirror, { mirror_key: "conn-a" }],
    ["setPrimaryMirror", setPrimaryMirror, { mirror_key: "conn-a" }],
  ])(
    "%s refuses a product maintainer who does not manage the owning account",
    async (_name, action, extra) => {
      // PutRepository holds (product-scoped membership) but the account check
      // does not — the connections belong to the account, not the product.
      mockIsAuthorized.mockReturnValue(true);
      mockCanManageAccount.mockReturnValue(false);
      mockProductsTable.fetchById.mockResolvedValue(
        productWith(
          { "conn-a": mirror({ connection_id: "conn-a", is_primary: true }) },
          "conn-a"
        )
      );

      const result = await action(
        FORM_STATE,
        formDataFor({ account_id: "acct", product_id: "prod", ...extra })
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Only owners and maintainers");
      expect(mockProductsTable.update).not.toHaveBeenCalled();
    }
  );

  test("refuses when the owning account no longer exists", async () => {
    asAccountManager();
    mockAccountsTable.fetchById.mockResolvedValue(null);

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
});
