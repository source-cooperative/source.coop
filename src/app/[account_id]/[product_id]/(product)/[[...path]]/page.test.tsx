/** @jest-environment node */

// Mock component imports first
jest.mock("./loading", () => ({}));
jest.mock("@/components", () => ({
  DirectoryList: jest.fn(),
  ObjectSummary: jest.fn(),
  ObjectPreview: jest.fn(),
}));

jest.mock("@/lib", () => ({
  productsTable: {
    fetchById: jest.fn(),
  },
  storage: {},
  dataConnectionsTable: {},
  LOGGER: {},
  fileSourceUrl: jest.fn(),
}));

import { generateMetadata } from "./page";
import { productsTable } from "@/lib";

describe("Product Page Metadata", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("returns OpenGraph metadata for product root path", async () => {
    const mockProduct = {
      id: "test-product",
      title: "Test Product",
      description: "A test product description",
    };

    (productsTable.fetchById as jest.Mock).mockResolvedValue(mockProduct);

    const params = Promise.resolve({
      account_id: "test-account",
      product_id: "test-product",
    });

    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe("Test Product");
    expect(metadata.description).toBe("A test product description");
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe("Test Product");
    expect(metadata.openGraph?.description).toBe("A test product description");
    expect(metadata.openGraph?.type).toBe("website");
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toBe("Test Product");
    expect(metadata.twitter?.description).toBe("A test product description");
  });

  it("returns OpenGraph metadata for product with path", async () => {
    const mockProduct = {
      id: "test-product",
      title: "Test Product",
      description: "A test product description",
    };

    (productsTable.fetchById as jest.Mock).mockResolvedValue(mockProduct);

    const params = Promise.resolve({
      account_id: "test-account",
      product_id: "test-product",
      path: ["folder", "subfolder"],
    });

    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe("folder/subfolder | Test Product");
    expect(metadata.description).toBe("A test product description");
    expect(metadata.openGraph?.title).toBe("folder/subfolder | Test Product");
    expect(metadata.openGraph?.description).toBe("A test product description");
  });

  it("returns default values when product is not found", async () => {
    (productsTable.fetchById as jest.Mock).mockResolvedValue(null);

    const params = Promise.resolve({
      account_id: "test-account",
      product_id: "test-product",
    });

    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe("Untitled Product");
    expect(metadata.description).toBe("A product on Source.coop");
    expect(metadata.openGraph?.title).toBe("Untitled Product");
    expect(metadata.openGraph?.description).toBe("A product on Source.coop");
  });
});
