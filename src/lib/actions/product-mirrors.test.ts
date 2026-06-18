import { addProductMirror } from "./product-mirrors";
import {
  dataConnectionsTable,
  productsTable,
  accountsTable,
} from "../clients/database";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { revalidatePath } from "next/cache";
import {
  AccountFlags,
  AccountType,
  DataProvider,
  type DataConnection,
  type Product,
  type UserSession,
} from "@/types";
import type { Account } from "@/types";

jest.mock("../clients/database", () => ({
  dataConnectionsTable: {
    fetchById: jest.fn(),
  },
  productsTable: {
    fetchById: jest.fn(),
    update: jest.fn(),
  },
  accountsTable: {
    fetchById: jest.fn(),
  },
}));

jest.mock("@/lib/api/utils", () => ({
  getPageSession: jest.fn(),
}));

jest.mock("@/lib/api/authz", () => ({
  isAuthorized: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockDataConnectionsTable = dataConnectionsTable as jest.Mocked<
  typeof dataConnectionsTable
>;
const mockProductsTable = productsTable as jest.Mocked<typeof productsTable>;
const mockAccountsTable = accountsTable as jest.Mocked<typeof accountsTable>;
const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockIsAuthorized = isAuthorized as jest.MockedFunction<
  typeof isAuthorized
>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;

const mockSession: UserSession = {
  identity_id: "identity-1",
  account: {
    account_id: "user-1",
    name: "Test User",
    type: AccountType.INDIVIDUAL,
    disabled: false,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    flags: [],
    identity_id: "identity-1",
    metadata_public: {},
  },
};

function makeConnection(
  overrides: Partial<DataConnection> = {}
): DataConnection {
  return {
    data_connection_id: "test-connection",
    name: "Test Connection",
    read_only: false,
    allowed_visibilities: [],
    details: {
      provider: DataProvider.S3,
      bucket: "test-bucket",
      base_prefix: "",
      region: "us-east-1" as any,
    },
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    account_id: "owner-account",
    name: "Owner Account",
    type: AccountType.INDIVIDUAL,
    disabled: false,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    flags: [],
    identity_id: "owner-identity",
    metadata_public: {},
    ...overrides,
  } as Account;
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    product_id: "test-product",
    account_id: "owner-account",
    title: "Test Product",
    description: "A test product",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    visibility: "public" as any,
    disabled: false,
    featured: 0,
    metadata: {
      primary_mirror: "existing-connection",
      mirrors: {
        "existing-connection": {
          storage_type: "s3",
          connection_id: "existing-connection",
          prefix: "owner-account/test-product/",
          is_primary: true,
        },
      },
      tags: [],
    },
    ...overrides,
  };
}

describe("addProductMirror", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPageSession.mockResolvedValue(mockSession);
    mockIsAuthorized.mockReturnValue(true);
    mockProductsTable.update.mockResolvedValue(makeProduct());
    mockRevalidatePath.mockReturnValue(undefined);
  });

  describe("required_flag enforcement", () => {
    it("allows when the connection has no required_flag", async () => {
      const connection = makeConnection({ required_flag: undefined });
      const account = makeAccount({ flags: [] });
      const product = makeProduct();

      mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
      mockAccountsTable.fetchById.mockResolvedValue(account);
      mockProductsTable.fetchById.mockResolvedValue(product);

      const result = await addProductMirror(
        "owner-account",
        "test-product",
        "test-connection"
      );

      expect(result.success).toBe(true);
    });

    it("allows when the account has the required_flag", async () => {
      const connection = makeConnection({
        required_flag: AccountFlags.CREATE_REPOSITORIES,
      });
      const account = makeAccount({
        flags: [AccountFlags.CREATE_REPOSITORIES],
      });
      const product = makeProduct();

      mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
      mockAccountsTable.fetchById.mockResolvedValue(account);
      mockProductsTable.fetchById.mockResolvedValue(product);

      const result = await addProductMirror(
        "owner-account",
        "test-product",
        "test-connection"
      );

      expect(result.success).toBe(true);
    });

    it("rejects when the account lacks the required_flag", async () => {
      const connection = makeConnection({
        required_flag: AccountFlags.CREATE_REPOSITORIES,
      });
      const account = makeAccount({ flags: [] });

      mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
      mockAccountsTable.fetchById.mockResolvedValue(account);

      const result = await addProductMirror(
        "owner-account",
        "test-product",
        "test-connection"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("required flag");
      expect(result.error).toContain(AccountFlags.CREATE_REPOSITORIES);
      expect(mockProductsTable.fetchById).not.toHaveBeenCalled();
    });

    it("rejects when the account has different flags but not the required one", async () => {
      const connection = makeConnection({
        required_flag: AccountFlags.CREATE_ORGANIZATIONS,
      });
      const account = makeAccount({
        flags: [AccountFlags.CREATE_REPOSITORIES],
      });

      mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
      mockAccountsTable.fetchById.mockResolvedValue(account);

      const result = await addProductMirror(
        "owner-account",
        "test-product",
        "test-connection"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("required flag");
      expect(result.error).toContain(AccountFlags.CREATE_ORGANIZATIONS);
    });

    it("allows when the account has the admin flag and connection requires admin", async () => {
      const connection = makeConnection({
        required_flag: AccountFlags.ADMIN,
      });
      const account = makeAccount({
        flags: [AccountFlags.ADMIN],
      });
      const product = makeProduct();

      mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
      mockAccountsTable.fetchById.mockResolvedValue(account);
      mockProductsTable.fetchById.mockResolvedValue(product);

      const result = await addProductMirror(
        "owner-account",
        "test-product",
        "test-connection"
      );

      expect(result.success).toBe(true);
    });
  });

  describe("error handling", () => {
    it("returns unauthenticated when no session", async () => {
      mockGetPageSession.mockResolvedValue(null);

      const result = await addProductMirror(
        "owner-account",
        "test-product",
        "test-connection"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthenticated");
      expect(mockDataConnectionsTable.fetchById).not.toHaveBeenCalled();
    });

    it("returns error when data connection not found", async () => {
      mockDataConnectionsTable.fetchById.mockResolvedValue(null);

      const result = await addProductMirror(
        "owner-account",
        "test-product",
        "missing-connection"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("missing-connection");
      expect(mockAccountsTable.fetchById).not.toHaveBeenCalled();
    });

    it("returns error when owner account not found", async () => {
      mockDataConnectionsTable.fetchById.mockResolvedValue(makeConnection());
      mockAccountsTable.fetchById.mockResolvedValue(null);

      const result = await addProductMirror(
        "missing-account",
        "test-product",
        "test-connection"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("missing-account");
    });

    it("returns error when product not found", async () => {
      mockDataConnectionsTable.fetchById.mockResolvedValue(makeConnection());
      mockAccountsTable.fetchById.mockResolvedValue(makeAccount());
      mockProductsTable.fetchById.mockResolvedValue(null);

      const result = await addProductMirror(
        "owner-account",
        "missing-product",
        "test-connection"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("missing-product");
    });

    it("returns unauthorized when session lacks permission", async () => {
      mockDataConnectionsTable.fetchById.mockResolvedValue(makeConnection());
      mockAccountsTable.fetchById.mockResolvedValue(makeAccount());
      mockProductsTable.fetchById.mockResolvedValue(makeProduct());
      mockIsAuthorized.mockReturnValue(false);

      const result = await addProductMirror(
        "owner-account",
        "test-product",
        "test-connection"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
      expect(mockProductsTable.update).not.toHaveBeenCalled();
    });
  });

  describe("successful mirror addition", () => {
    it("adds the mirror to the product's metadata", async () => {
      const connection = makeConnection({ prefix_template: undefined });
      const account = makeAccount({ flags: [] });
      const product = makeProduct();

      mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
      mockAccountsTable.fetchById.mockResolvedValue(account);
      mockProductsTable.fetchById.mockResolvedValue(product);

      await addProductMirror("owner-account", "test-product", "test-connection");

      expect(mockProductsTable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            mirrors: expect.objectContaining({
              "test-connection": expect.objectContaining({
                connection_id: "test-connection",
                is_primary: false,
                prefix: "owner-account/test-product/",
                storage_type: "s3",
              }),
            }),
          }),
        })
      );
    });

    it("uses azure storage_type for Azure data connections", async () => {
      const connection = makeConnection({
        details: {
          provider: DataProvider.Azure,
          account_name: "storageacct",
          container_name: "container",
          base_prefix: "",
          region: "westeurope" as any,
        },
      });
      const product = makeProduct();

      mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
      mockAccountsTable.fetchById.mockResolvedValue(makeAccount());
      mockProductsTable.fetchById.mockResolvedValue(product);

      await addProductMirror("owner-account", "test-product", "test-connection");

      expect(mockProductsTable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            mirrors: expect.objectContaining({
              "test-connection": expect.objectContaining({
                storage_type: "azure",
              }),
            }),
          }),
        })
      );
    });

    it("revalidates the product path on success", async () => {
      mockDataConnectionsTable.fetchById.mockResolvedValue(makeConnection());
      mockAccountsTable.fetchById.mockResolvedValue(makeAccount());
      mockProductsTable.fetchById.mockResolvedValue(makeProduct());

      await addProductMirror("owner-account", "test-product", "test-connection");

      expect(mockRevalidatePath).toHaveBeenCalled();
    });
  });
});
