import { ProductMetadataSchema } from "./product";

const baseMetadata = {
  mirrors: {
    "primary-data-connection": {
      storage_type: "s3" as const,
      connection_id: "primary-data-connection",
      prefix: "account/product/",
      is_primary: true,
    },
  },
  primary_mirror: "primary-data-connection",
};

describe("ProductMetadataSchema DOI validation", () => {
  it("accepts metadata without a DOI", () => {
    expect(ProductMetadataSchema.safeParse(baseMetadata).success).toBe(true);
  });

  it.each([
    "10.1234/foo.bar",
    "10.1000/182",
    "10.1234/abc-DEF_123;(x):y/z",
  ])("accepts well-formed DOI %p", (doi) => {
    const result = ProductMetadataSchema.safeParse({ ...baseMetadata, doi });
    expect(result.success).toBe(true);
  });

  it.each([
    "not-a-doi",
    "10/missing-registrant",
    "10.1234/", // empty suffix
    "https://doi.org/10.1234/foo", // must be the bare DOI, not a URL
    "<script>alert(1)</script>",
    "10.12/too-short-registrant",
  ])("rejects malformed DOI %p", (doi) => {
    const result = ProductMetadataSchema.safeParse({ ...baseMetadata, doi });
    expect(result.success).toBe(false);
  });
});
