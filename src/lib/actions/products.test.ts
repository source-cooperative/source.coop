import { createProduct, updateProduct } from "./products";
import { productsTable, dataConnectionsTable } from "@/lib/clients/database";
import { isAuthorized } from "@/lib/api/authz";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ProductVisibility } from "@/types/product";
import { DataProvider, S3Regions } from "@/types/data-connection";
import { AccountFlags, Actions } from "@/types/shared";
import { AccountType } from "@/types/account";
import type { DataConnection, Product, UserSession } from "@/types";

jest.mock("@/lib/clients/database", () => ({
  productsTable: {
    create: jest.fn(),
    fetchById: jest.fn(),
    update: jest.fn(),
  },
  dataConnectionsTable: {
    fetchById: jest.fn(),
  },
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
  productUrl: jest.fn().mockReturnValue("/test-url"),
  editProductDetailsUrl: jest.fn().mockReturnValue("/edit-url"),
}));

const mockGetPageSession =
  require("@/lib").getPageSession as jest.MockedFunction<any>;
const mockProductsTable = productsTable as jest.Mocked<typeof productsTable>;
const mockDataConnectionsTable = dataConnectionsTable as jest.Mocked<
  typeof dataConnectionsTable
>;
const mockIsAuthorized = isAuthorized as jest.MockedFunction<
  typeof isAuthorized
>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;

const mockSession: UserSession = {
  identity_id: "test-identity-id",
  account: {
    account_id: "user-account-id",
    name: "Test User",
    type: AccountType.INDIVIDUAL,
    disabled: false,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    flags: [AccountFlags.CREATE_REPOSITORIES],
    identity_id: "test-identity-id",
    metadata_public: {},
  },
};

const mockDataConnection: DataConnection = {
  data_connection_id: "aws-opendata-us-west-2",
  name: "AWS Open Data US West 2",
  read_only: false,
  allowed_visibilities: [ProductVisibility.Public, ProductVisibility.Unlisted],
  details: {
    provider: DataProvider.S3,
    bucket: "test-bucket",
    base_prefix: "",
    region: S3Regions.US_WEST_2,
  },
};

const mockProduct: Product = {
  account_id: "user-account-id",
  product_id: "test-product",
  title: "Test Product",
  description: "A test product",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  visibility: ProductVisibility.Public,
  disabled: false,
  featured: 0,
  metadata: {
    tags: [],
    primary_mirror: "aws-opendata-us-west-2",
    mirrors: {
      "aws-opendata-us-west-2": {
        storage_type: "s3",
        connection_id: "aws-opendata-us-west-2",
        prefix: "user-account-id/test-product/",
        is_primary: true,
      },
    },
  },
};

function makeFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.append(key, value);
  }
  return formData;
}

describe("createProduct", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns unauthenticated error when no session", async () => {
    mockGetPageSession.mockResolvedValue(null);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Test",
      description: "Test desc",
      visibility: ProductVisibility.Public,
    });

    const result = await createProduct(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Unauthenticated");
  });

  it("returns field errors when form data is invalid", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);

    const formData = makeFormData({
      account_id: "user-account-id",
      // missing product_id, title, etc.
    });

    const result = await createProduct(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid form data");
    expect(Object.keys(result.fieldErrors).length).toBeGreaterThan(0);
  });

  it("returns visibility field error when visibility is not in allowed_visibilities", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);
    mockDataConnectionsTable.fetchById.mockResolvedValue(mockDataConnection);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Test Product",
      description: "A test product",
      visibility: ProductVisibility.Restricted, // not allowed
    });

    const result = await createProduct(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid visibility for this data connection");
    expect(result.fieldErrors.visibility).toBeDefined();
    expect(result.fieldErrors.visibility[0]).toContain("public");
    expect(result.fieldErrors.visibility[0]).toContain("unlisted");
  });

  it("accepts visibility when it is in allowed_visibilities", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);
    mockDataConnectionsTable.fetchById.mockResolvedValue(mockDataConnection);
    mockIsAuthorized.mockReturnValue(true);
    mockProductsTable.create.mockResolvedValue(mockProduct);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Test Product",
      description: "A test product",
      visibility: ProductVisibility.Public, // allowed
    });

    await createProduct(null, formData);

    expect(mockProductsTable.create).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalled();
  });

  it("returns unauthorized error when not authorized to create", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);
    mockDataConnectionsTable.fetchById.mockResolvedValue(mockDataConnection);
    mockIsAuthorized.mockReturnValue(false);

    const formData = makeFormData({
      account_id: "other-account-id",
      product_id: "test-product",
      title: "Test Product",
      description: "A test product",
      visibility: ProductVisibility.Public,
    });

    const result = await createProduct(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Unauthorized to create product");
    expect(mockProductsTable.create).not.toHaveBeenCalled();
  });

  it("allows all visibilities when data connection is not found", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);
    mockDataConnectionsTable.fetchById.mockResolvedValue(null);
    mockIsAuthorized.mockReturnValue(true);
    mockProductsTable.create.mockResolvedValue(mockProduct);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Test Product",
      description: "A test product",
      visibility: ProductVisibility.Restricted,
    });

    await createProduct(null, formData);

    expect(mockProductsTable.create).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalled();
  });
});

describe("updateProduct", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns unauthenticated error when no session", async () => {
    mockGetPageSession.mockResolvedValue(null);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Updated Title",
      description: "Updated desc",
      visibility: ProductVisibility.Public,
    });

    const result = await updateProduct(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Unauthenticated");
  });

  it("returns error when account_id or product_id is missing", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);

    const formData = makeFormData({
      title: "Updated Title",
    });

    const result = await updateProduct(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Account ID and Product ID are required");
  });

  it("returns error when product is not found", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);
    mockProductsTable.fetchById.mockResolvedValue(null);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "nonexistent-product",
      title: "Updated Title",
      description: "Updated desc",
      visibility: ProductVisibility.Public,
    });

    const result = await updateProduct(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Product not found");
  });

  it("returns unauthorized error when not authorized to update", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);
    mockProductsTable.fetchById.mockResolvedValue(mockProduct);
    mockIsAuthorized.mockReturnValue(false);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Updated Title",
      description: "Updated desc",
      visibility: ProductVisibility.Public,
    });

    const result = await updateProduct(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Unauthorized to update this product");
    expect(mockProductsTable.update).not.toHaveBeenCalled();
  });

  it("returns visibility field error when visibility is not in allowed_visibilities", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);
    mockProductsTable.fetchById.mockResolvedValue(mockProduct);
    mockIsAuthorized.mockReturnValue(true);
    mockDataConnectionsTable.fetchById.mockResolvedValue(mockDataConnection);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Updated Title",
      description: "Updated desc",
      visibility: ProductVisibility.Restricted, // not allowed
    });

    const result = await updateProduct(null, formData);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Invalid visibility for this data connection");
    expect(result.fieldErrors.visibility).toBeDefined();
    expect(result.fieldErrors.visibility[0]).toContain("public");
    expect(result.fieldErrors.visibility[0]).toContain("unlisted");
    expect(mockProductsTable.update).not.toHaveBeenCalled();
  });

  it("accepts visibility when it is in allowed_visibilities", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);
    mockProductsTable.fetchById.mockResolvedValue(mockProduct);
    mockIsAuthorized.mockReturnValue(true);
    mockDataConnectionsTable.fetchById.mockResolvedValue(mockDataConnection);
    mockProductsTable.update.mockResolvedValue(mockProduct);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Updated Title",
      description: "Updated desc",
      visibility: ProductVisibility.Public, // allowed
    });

    const result = await updateProduct(null, formData);

    expect(result.success).toBe(true);
    expect(result.message).toBe("Product updated successfully!");
    expect(mockProductsTable.update).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it("allows all visibilities when data connection is not found", async () => {
    mockGetPageSession.mockResolvedValue(mockSession);
    mockProductsTable.fetchById.mockResolvedValue(mockProduct);
    mockIsAuthorized.mockReturnValue(true);
    mockDataConnectionsTable.fetchById.mockResolvedValue(null);
    mockProductsTable.update.mockResolvedValue(mockProduct);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Updated Title",
      description: "Updated desc",
      visibility: ProductVisibility.Restricted,
    });

    const result = await updateProduct(null, formData);

    expect(result.success).toBe(true);
    expect(mockProductsTable.update).toHaveBeenCalled();
  });

  it("validates against the product's own data connection (primary_mirror)", async () => {
    const productWithDifferentConnection: Product = {
      ...mockProduct,
      metadata: {
        ...mockProduct.metadata,
        primary_mirror: "primary-data-connection",
        mirrors: {
          "primary-data-connection": {
            storage_type: "s3",
            connection_id: "primary-data-connection",
            prefix: "user-account-id/test-product/",
            is_primary: true,
          },
        },
      },
    };

    const fullVisibilityConnection: DataConnection = {
      ...mockDataConnection,
      data_connection_id: "primary-data-connection",
      allowed_visibilities: [
        ProductVisibility.Public,
        ProductVisibility.Unlisted,
        ProductVisibility.Restricted,
      ],
    };

    mockGetPageSession.mockResolvedValue(mockSession);
    mockProductsTable.fetchById.mockResolvedValue(productWithDifferentConnection);
    mockIsAuthorized.mockReturnValue(true);
    mockDataConnectionsTable.fetchById.mockResolvedValue(fullVisibilityConnection);
    mockProductsTable.update.mockResolvedValue(productWithDifferentConnection);

    const formData = makeFormData({
      account_id: "user-account-id",
      product_id: "test-product",
      title: "Updated Title",
      description: "Updated desc",
      visibility: ProductVisibility.Restricted, // allowed by this connection
    });

    const result = await updateProduct(null, formData);

    expect(result.success).toBe(true);
    // Verify we fetched the correct data connection
    expect(mockDataConnectionsTable.fetchById).toHaveBeenCalledWith(
      "primary-data-connection"
    );
  });
});
