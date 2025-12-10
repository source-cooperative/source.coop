/** @jest-environment node */

// Mock component imports first
jest.mock("./loading", () => ({}));
jest.mock("@/components", () => {
  const { generateProductMetadata } = jest.requireActual(
    "@/components/features/metadata/ProductMetadata"
  );
  return {
    DirectoryList: jest.fn(),
    ObjectSummary: jest.fn(),
    ObjectPreview: jest.fn(),
    generateProductMetadata,
  };
});

jest.mock("@/lib", () => ({
  productsTable: {
    fetchById: jest.fn(),
  },
  storage: {},
  dataConnectionsTable: {},
  LOGGER: {},
  fileSourceUrl: jest.fn(),
  CONFIG: {
    google: {
      siteVerification: "test-verification",
    },
  },
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("@/lib/baseUrl", () => ({
  getBaseUrl: jest.fn().mockResolvedValue("https://source.coop"),
}));

import { generateMetadata } from "./page";
import { productsTable } from "@/lib";

describe("Product Page Metadata", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns OpenGraph metadata for product", async () => {
    const mockProduct = {
      id: "test-product",
      product_id: "test-product",
      title: "Test Product",
      description: "A test product description",
      account: {
        account_id: "test-account",
        name: "Test Account",
      },
    };

    (productsTable.fetchById as jest.Mock).mockResolvedValue(mockProduct);

    const metadata = await generateMetadata({
      params: Promise.resolve({
        account_id: "test-account",
        product_id: "test-product",
      }),
    });

    expect(metadata.title).toBe("Test Product · Test Account · Source Cooperative");
    expect(metadata.description).toBe("A test product description");

    // Test OpenGraph metadata
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe("Test Product · Test Account · Source Cooperative");
    expect(metadata.openGraph?.description).toBe("A test product description");
    expect(metadata.openGraph?.url).toBe("https://source.coop/test-account/test-product");

    // Test OpenGraph image
    expect(metadata.openGraph?.images).toBeDefined();
    expect(Array.isArray(metadata.openGraph?.images)).toBe(true);
    expect(metadata.openGraph?.images?.[0]).toMatchObject({
      url: "https://source.coop/api/og?type=product&account_id=test-account&product_id=test-product",
      width: 1200,
      height: 630,
    });

    // Test Twitter metadata
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.title).toBe("Test Product · Test Account · Source Cooperative");
    expect(metadata.twitter?.description).toBe("A test product description");
    expect(metadata.twitter?.images).toContain("https://source.coop/api/og?type=product&account_id=test-account&product_id=test-product");
  });

  it("calls notFound when product is not found", async () => {
    const { notFound } = await import("next/navigation");

    (productsTable.fetchById as jest.Mock).mockResolvedValue(null);

    await expect(
      generateMetadata({
        params: Promise.resolve({
          account_id: "test-account",
          product_id: "test-product",
        }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });
});
