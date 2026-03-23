// Mock all component imports to avoid importing react-markdown and other problematic dependencies
jest.mock("@/components/layout", () => ({}));
jest.mock("@/components/features/products/ProductsList", () => ({}));
jest.mock("@/components/features/products/ProductsFilters", () => ({}));
jest.mock("@/lib/actions/products", () => ({
  getProducts: jest.fn(),
}));

import { metadata } from "./page";

describe("Products Listing Page Metadata", () => {
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
