jest.mock("@/components/layout", () => ({}));
jest.mock("@/components/features/products/ProductsList", () => ({}));
jest.mock("@/components/features/products/ProductsFilters", () => ({
  ProductsFilters: () => null,
}));
jest.mock("@/lib/actions/products", () => ({
  getFeaturedProducts: jest.fn(),
  getPaginatedProducts: jest.fn().mockResolvedValue({ products: [] }),
}));

import { metadata } from "./(app)/products/page";

describe("Products Page Metadata", () => {
  it("has proper OpenGraph metadata", () => {
    expect(metadata.title).toBe("Products | Source Cooperative");
    expect(metadata.description).toBe(
      "Browse and discover public data products on Source.coop"
    );
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe("Products | Source Cooperative");
    expect(metadata.openGraph?.description).toBe(
      "Browse and discover public data products on Source.coop"
    );
    expect(metadata.openGraph?.type).toBe("website");
  });

  it("has proper Twitter Card metadata", () => {
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.card).toBe("summary_large_image");
    expect(metadata.twitter?.title).toBe("Products | Source Cooperative");
    expect(metadata.twitter?.description).toBe(
      "Browse and discover public data products on Source.coop"
    );
  });
});
