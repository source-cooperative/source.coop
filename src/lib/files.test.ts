import { getExtension, isStoreExtension, STORE_EXTENSIONS } from "./files";

describe("getExtension", () => {
  it("returns the lowercased suffix of the last path segment", () => {
    expect(getExtension("data.TIF")).toBe("tif");
    expect(getExtension("a/b/store.zarr")).toBe("zarr");
    expect(getExtension("gfs.icechunk")).toBe("icechunk");
  });

  it("returns undefined when there is no extension", () => {
    expect(getExtension("chunks")).toBeUndefined();
    expect(getExtension("a/b/chunks")).toBeUndefined();
    expect(getExtension("")).toBeUndefined();
  });
});

describe("isStoreExtension", () => {
  it("is true for a configured store extension, false otherwise", () => {
    expect(isStoreExtension("zarr")).toBe(true);
    expect(isStoreExtension("icechunk")).toBe(true);
    expect(isStoreExtension("tif")).toBe(false);
    expect(isStoreExtension(undefined)).toBe(false);
  });

  it("covers every configured store extension, case-insensitively", () => {
    for (const ext of STORE_EXTENSIONS) {
      expect(isStoreExtension(getExtension(`some/dataset.${ext}`))).toBe(true);
      expect(
        isStoreExtension(getExtension(`some/dataset.${ext.toUpperCase()}`)),
      ).toBe(true);
    }
  });
});
