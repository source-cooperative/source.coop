import { getExtension, isViewableStorePath, STORE_EXTENSIONS } from "./files";

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

describe("isViewableStorePath", () => {
  it("is true for a .zarr or .icechunk directory prefix", () => {
    expect(isViewableStorePath("gfs.icechunk")).toBe(true);
    expect(isViewableStorePath("a/b/store.zarr")).toBe(true);
  });

  it("ignores a trailing slash", () => {
    expect(isViewableStorePath("gfs.icechunk/")).toBe(true);
    expect(isViewableStorePath("a/b/store.zarr/")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isViewableStorePath("GFS.ICECHUNK")).toBe(true);
    expect(isViewableStorePath("Store.Zarr")).toBe(true);
  });

  it("is false for a non-store directory", () => {
    expect(isViewableStorePath("chunks")).toBe(false);
    expect(isViewableStorePath("a/b/chunks")).toBe(false);
  });

  it("is false for a non-store file", () => {
    expect(isViewableStorePath("data.tif")).toBe(false);
    expect(isViewableStorePath("readme.md")).toBe(false);
  });

  it("covers every configured store extension", () => {
    for (const ext of STORE_EXTENSIONS) {
      expect(isViewableStorePath(`some/dataset.${ext}`)).toBe(true);
    }
  });
});
