import { createProduct } from "./products";
import {
  productsTable,
  dataConnectionsTable,
  accountsTable,
} from "../clients/database";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import {
  AccountFlags,
  AccountType,
  DataProvider,
  type DataConnection,
  type UserSession,
} from "@/types";
import type { Account } from "@/types";

jest.mock("../clients/database", () => ({
  productsTable: {
    create: jest.fn(),
  },
  dataConnectionsTable: {
    fetchById: jest.fn(),
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

// next/cache is used by product-mirrors; stub it here for completeness
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockProductsTable = productsTable as jest.Mocked<typeof productsTable>;
const mockDataConnectionsTable = dataConnectionsTable as jest.Mocked<
  typeof dataConnectionsTable
>;
const mockAccountsTable = accountsTable as jest.Mocked<typeof accountsTable>;
const mockGetPageSession = getPageSession as jest.MockedFunction<
  typeof getPageSession
>;
const mockIsAuthorized = isAuthorized as jest.MockedFunction<
  typeof isAuthorized
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
    data_connection_id: "aws-opendata-us-west-2",
    name: "AWS Open Data",
    read_only: false,
    allowed_visibilities: [],
    details: {
      provider: DataProvider.S3,
      bucket: "opendata-bucket",
      base_prefix: "",
      region: "us-west-2" as any,
    },
    ...overrides,
  };
}

function makeOwnerAccount(overrides: Partial<Account> = {}): Account {
  return {
    account_id: "test-account",
    name: "Test Account",
    type: AccountType.INDIVIDUAL,
    disabled: false,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    flags: [],
    identity_id: "identity-2",
    metadata_public: {},
    ...overrides,
  } as Account;
}

function formDataFor(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

const validProductForm = {
  account_id: "test-account",
  product_id: "test-product",
  title: "Test Product",
  description: "A test product",
  visibility: "public",
};

describe("createProduct — required_flag enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPageSession.mockResolvedValue(mockSession);
    mockIsAuthorized.mockReturnValue(true);
    mockProductsTable.create.mockResolvedValue(undefined as any);
  });

  it("allows creation when the connection has no required_flag", async () => {
    const connection = makeConnection({ required_flag: undefined });
    const account = makeOwnerAccount({ flags: [] });

    mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
    mockAccountsTable.fetchById.mockResolvedValue(account);

    const result = await createProduct({}, formDataFor(validProductForm));

    expect(result.success).toBe(true);
    expect(mockProductsTable.create).toHaveBeenCalled();
  });

  it("allows creation when the account has the required_flag", async () => {
    const connection = makeConnection({
      required_flag: AccountFlags.CREATE_REPOSITORIES,
    });
    const account = makeOwnerAccount({
      flags: [AccountFlags.CREATE_REPOSITORIES],
    });

    mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
    mockAccountsTable.fetchById.mockResolvedValue(account);

    const result = await createProduct({}, formDataFor(validProductForm));

    expect(result.success).toBe(true);
    expect(mockProductsTable.create).toHaveBeenCalled();
  });

  it("rejects creation when the account lacks the required_flag", async () => {
    const connection = makeConnection({
      required_flag: AccountFlags.CREATE_REPOSITORIES,
    });
    const account = makeOwnerAccount({ flags: [] });

    mockDataConnectionsTable.fetchById.mockResolvedValue(connection);
    mockAccountsTable.fetchById.mockResolvedValue(account);

    const result = await createProduct({}, formDataFor(validProductForm));

    expect(result.success).toBe(false);
    expect(result.message).toContain("required flag");
    expect(result.message).toContain(AccountFlags.CREATE_REPOSITORIES);
    expect(mockProductsTable.create).not.toHaveBeenCalled();
  });

  it("allows creation when data connection is not found (defensive: no gate to enforce)", async () => {
    // If the default connection doesn't exist in the DB, we cannot enforce the
    // flag — proceed rather than hard-blocking product creation.
    mockDataConnectionsTable.fetchById.mockResolvedValue(null);
    mockAccountsTable.fetchById.mockResolvedValue(makeOwnerAccount());

    const result = await createProduct({}, formDataFor(validProductForm));

    expect(result.success).toBe(true);
    expect(mockProductsTable.create).toHaveBeenCalled();
  });

  it("returns error when the owner account is not found", async () => {
    mockDataConnectionsTable.fetchById.mockResolvedValue(makeConnection());
    mockAccountsTable.fetchById.mockResolvedValue(null);

    const result = await createProduct({}, formDataFor(validProductForm));

    expect(result.success).toBe(false);
    expect(result.message).toContain("Account not found");
    expect(mockProductsTable.create).not.toHaveBeenCalled();
  });

  it("returns unauthenticated when no session", async () => {
    mockGetPageSession.mockResolvedValue(null);

    const result = await createProduct({}, formDataFor(validProductForm));

    expect(result.success).toBe(false);
    expect(result.message).toBe("Unauthenticated");
    expect(mockDataConnectionsTable.fetchById).not.toHaveBeenCalled();
  });

  it("returns validation error when form data is invalid", async () => {
    const result = await createProduct(
      {},
      formDataFor({ account_id: "test-account" }) // missing required fields
    );

    expect(result.success).toBe(false);
    expect(mockDataConnectionsTable.fetchById).not.toHaveBeenCalled();
  });
});
