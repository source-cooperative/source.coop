import { exampleLocation } from "./DataConnectionForm";

const TEMPLATE = "example-org/rainfall/";

describe("exampleLocation", () => {
  it("joins backend, base prefix and template", () => {
    expect(exampleLocation("s3://archive", "source/", TEMPLATE)).toBe(
      "s3://archive/source/example-org/rainfall/"
    );
  });

  it("does not double a slash when segments carry their own", () => {
    // A doubled slash in an object key is a different key, not a cosmetic slip.
    expect(exampleLocation("s3://archive", "/source/", "/" + TEMPLATE)).toBe(
      "s3://archive/source/example-org/rainfall/"
    );
  });

  it("adds the separator when no segment carries one", () => {
    expect(exampleLocation("s3://archive", "source", "example-org")).toBe(
      "s3://archive/source/example-org"
    );
  });

  it("omits the base prefix when it is blank", () => {
    expect(exampleLocation("s3://archive", "", TEMPLATE)).toBe(
      "s3://archive/example-org/rainfall/"
    );
  });

  it("keeps a trailing slash only where the template has one", () => {
    expect(exampleLocation("s3://archive", "", "example-org/rainfall")).toBe(
      "s3://archive/example-org/rainfall"
    );
  });

  it("falls back to the bucket root when there is nothing else", () => {
    expect(exampleLocation("s3://archive", "", "")).toBe("s3://archive/");
  });

  it("works for a container-shaped backend too", () => {
    expect(
      exampleLocation("azure://acct/container", "source/", TEMPLATE)
    ).toBe("azure://acct/container/source/example-org/rainfall/");
  });
});
