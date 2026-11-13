import type { ReactElement } from "react";
import { ProductVisibility, type Product } from "@/types";
import { ProductSchemaMetadata } from "./ProductSchemaMetadata";

jest.mock("@/lib/baseUrl", () => ({
  getBaseUrl: jest.fn().mockResolvedValue("https://source.coop"),
}));

const product = (doi?: string): Product => ({
  account_id: "nasa",
  product_id: "floods",
  title: "Floods",
  description: "Flood extents",
  created_at: "2023-07-05T18:33:17Z",
  updated_at: "2025-08-21T16:39:55Z",
  visibility: ProductVisibility.Public,
  metadata: { mirrors: {}, primary_mirror: "", ...(doi && { doi }) },
  disabled: false,
  featured: 0,
});

async function jsonLd(p: Product) {
  const el = (await ProductSchemaMetadata({ product: p })) as ReactElement<{
    dangerouslySetInnerHTML: { __html: string };
  }>;
  return JSON.parse(el.props.dangerouslySetInnerHTML.__html);
}

describe("ProductSchemaMetadata identifier", () => {
  it("builds a doi.org URL from a bare DOI", async () => {
    const data = await jsonLd(product("10.34911/rdnt.ebk43x"));
    expect(data.identifier).toBe("https://doi.org/10.34911/rdnt.ebk43x");
  });

  it("does not double the prefix when the stored DOI is already a URL", async () => {
    const data = await jsonLd(product("https://doi.org/10.34911/rdnt.ebk43x"));
    expect(data.identifier).toBe("https://doi.org/10.34911/rdnt.ebk43x");
  });

  it("omits identifier when there is no DOI", async () => {
    const data = await jsonLd(product());
    expect(data).not.toHaveProperty("identifier");
  });
});
