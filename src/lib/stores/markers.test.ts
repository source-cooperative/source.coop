import { storeFormatFromListing } from "./markers";

const listing = (objects: string[], directories: string[] = []) => ({
  objects,
  directories,
});

describe("storeFormatFromListing", () => {
  it("detects an Icechunk v2 repo from its repo object and snapshots/", () => {
    expect(
      storeFormatFromListing(
        listing(["repo"], ["chunks", "manifests", "refs", "snapshots", "transactions"]),
      ),
    ).toBe("icechunk");
  });

  it("detects a legacy Icechunk repo from refs/ and snapshots/", () => {
    expect(
      storeFormatFromListing(listing([], ["chunks", "manifests", "refs", "snapshots"])),
    ).toBe("icechunk");
  });

  it("detects Zarr v3 from zarr.json", () => {
    expect(storeFormatFromListing(listing(["zarr.json"], ["temp"]))).toBe("zarr");
  });

  it.each([".zmetadata", ".zgroup", ".zarray"])("detects Zarr v2 from %s", (name) => {
    expect(storeFormatFromListing(listing([name]))).toBe("zarr");
  });

  it("ignores a directory that merely contains a store", () => {
    expect(storeFormatFromListing(listing(["README.md"], ["era5.zarr", "gfs.icechunk"]))).toBeNull();
  });

  it("ignores a lone repo object or a lone snapshots/ prefix", () => {
    expect(storeFormatFromListing(listing(["repo"]))).toBeNull();
    expect(storeFormatFromListing(listing([], ["snapshots"]))).toBeNull();
  });

  it("ignores an ordinary directory", () => {
    expect(storeFormatFromListing(listing(["a.tif", "b.parquet"], ["2024"]))).toBeNull();
  });
});
