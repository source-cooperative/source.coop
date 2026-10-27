/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@duckdb/node-api", () => ({
  DuckDBConnection: { create: jest.fn() },
}));
jest.mock("@/lib/logging", () => ({ LOGGER: { error: jest.fn() } }));
jest.mock("@/lib/urls", () => ({ fileSourceUrl: jest.fn() }));
jest.mock("@/lib/files", () => ({ getExtension: jest.fn() }));
jest.mock("@radix-ui/themes", () => ({ Code: () => null, Text: () => null }));
jest.mock("./PreviewIframe", () => ({}));

// The COG tiling probe calls fetch; make it fail fast so fileTypeLabel tests
// that exercise tif/tiff stay deterministic without real network calls.
global.fetch = jest.fn().mockRejectedValue(new Error("fetch is mocked"));

import { fileTypeLabel, parseCogTiling } from "./ObjectPreviewExternal";
import { DuckDBConnection } from "@duckdb/node-api";

const sourceUrl = "https://data.source.coop/account/product/file";

describe("fileTypeLabel", () => {
  describe("Record lookup", () => {
    it.each([
      ["tif", "COG"],
      ["tiff", "COG"],
      ["pmtiles", "PMTiles"],
      ["glb", "binary glTF"],
      ["gltf", "JSON glTF"],
      ["obj", "Wavefront OBJ"],
      ["stl", "STL mesh"],
      ["fgb", "FlatGeobuf"],
      ["geojson", "GeoJSON"],
      ["gpkg", "GeoPackage"],
      ["nc", "NetCDF"],
      ["h5", "HDF5"],
      ["las", "LAS point cloud"],
      ["laz", "LAZ point cloud"],
      ["copc", "Cloud-Optimized Point Cloud"],
      ["bmp", "Bitmap"],
      ["jpg", "JPEG"],
      ["md", "Markdown"],
      ["markdown", "Markdown"],
      ["txt", "Text"],
      ["jsonl", "Newline-delimited JSON"],
      ["ndjson", "Newline-delimited JSON"],
    ])(".%s → %s", async (ext, expected) => {
      await expect(fileTypeLabel(sourceUrl, ext)).resolves.toBe(expected);
    });
  });

  describe("default fallback", () => {
    it.each([
      ["csv", "CSV"],
      ["png", "PNG"],
      ["svg", "SVG"],
      ["gif", "GIF"],
      ["xyz", "XYZ"],
    ])(".%s → %s (toUpperCase)", async (ext, expected) => {
      await expect(fileTypeLabel(sourceUrl, ext)).resolves.toBe(expected);
    });
  });

  describe("parquet", () => {
    function mockDb(rows: unknown[][]) {
      const db = {
        run: jest.fn().mockResolvedValue(undefined),
        runAndReadAll: jest.fn().mockResolvedValue({ getRows: () => rows }),
        closeSync: jest.fn(),
      };
      (DuckDBConnection.create as jest.Mock).mockResolvedValue(db);
      return db;
    }

    beforeEach(() => jest.clearAllMocks());

    it("returns 'STAC GeoParquet' when the schema has stac_version and geometry", async () => {
      mockDb([[true]]);
      await expect(fileTypeLabel(sourceUrl, "parquet")).resolves.toBe(
        "STAC GeoParquet",
      );
    });

    it("returns 'Parquet' when the schema check finds no STAC columns", async () => {
      mockDb([]);
      await expect(fileTypeLabel(sourceUrl, "parquet")).resolves.toBe("Parquet");
    });

    it("returns 'Parquet' when DuckDB throws", async () => {
      (DuckDBConnection.create as jest.Mock).mockRejectedValue(
        new Error("connection failed"),
      );
      await expect(fileTypeLabel(sourceUrl, "parquet")).resolves.toBe("Parquet");
    });
  });
});

// Build a minimal standard TIFF buffer (little-endian, magic=42) with the
// given IFD entries. Each entry is { tag, value }; type is always LONG.
function buildTiff(entries: { tag: number; value: number }[]): Buffer {
  const headerSize = 8;
  const countSize = 2;
  const entrySize = 12;
  const size = headerSize + countSize + entries.length * entrySize;
  const buf = Buffer.alloc(size);
  buf.writeUInt16LE(0x4949, 0); // II
  buf.writeUInt16LE(42, 2);     // TIFF magic
  buf.writeUInt32LE(8, 4);      // IFD at offset 8
  buf.writeUInt16LE(entries.length, 8);
  for (let i = 0; i < entries.length; i++) {
    const base = 10 + i * entrySize;
    buf.writeUInt16LE(entries[i].tag, base);
    buf.writeUInt16LE(4, base + 2);           // type LONG
    buf.writeUInt32LE(1, base + 4);           // count 1
    buf.writeUInt32LE(entries[i].value, base + 8);
  }
  return buf;
}

describe("parseCogTiling", () => {
  it("returns null for an empty buffer", () => {
    expect(parseCogTiling(Buffer.alloc(0))).toBeNull();
  });

  it("returns null for a non-TIFF buffer", () => {
    expect(parseCogTiling(Buffer.from("not a tiff file"))).toBeNull();
  });

  it("returns 'tiff' when the IFD offset points past the buffer (IFD at end of file)", () => {
    // A regular TIFF writes its IFD at the end of the file; only the first 8 KB
    // of the file is probed, so the IFD offset will be beyond buf.length.
    const buf = Buffer.alloc(64);
    buf.writeUInt16LE(0x4949, 0); // II (little-endian)
    buf.writeUInt16LE(42, 2);     // TIFF magic
    buf.writeUInt32LE(0xffff, 4); // IFD offset far beyond the buffer
    expect(parseCogTiling(buf)).toBe("tiff");
  });

  it("returns 'striped' when RowsPerStrip is present and no tile tags", () => {
    const buf = buildTiff([
      { tag: 256, value: 1024 }, // ImageWidth
      { tag: 257, value: 1024 }, // ImageLength
      { tag: 278, value: 256 },  // RowsPerStrip
    ]);
    expect(parseCogTiling(buf)).toBe("striped");
  });

  it("returns null for a normally-tiled COG (multiple tiles)", () => {
    const buf = buildTiff([
      { tag: 256, value: 1024 }, // ImageWidth
      { tag: 257, value: 1024 }, // ImageLength
      { tag: 322, value: 256 },  // TileWidth
      { tag: 323, value: 256 },  // TileLength
    ]);
    expect(parseCogTiling(buf)).toBeNull();
  });

  it("returns 'single-tile' when the tile covers the full image", () => {
    const buf = buildTiff([
      { tag: 256, value: 256 },  // ImageWidth
      { tag: 257, value: 256 },  // ImageLength
      { tag: 322, value: 256 },  // TileWidth == ImageWidth
      { tag: 323, value: 256 },  // TileLength == ImageLength
    ]);
    expect(parseCogTiling(buf)).toBe("single-tile");
  });

  it("returns 'single-tile' when a larger tile covers a smaller image", () => {
    // A 512×512 tile wrapping a 300×300 image is still a single tile.
    const buf = buildTiff([
      { tag: 256, value: 300 },  // ImageWidth
      { tag: 257, value: 300 },  // ImageLength
      { tag: 322, value: 512 },  // TileWidth > ImageWidth
      { tag: 323, value: 512 },  // TileLength > ImageLength
    ]);
    expect(parseCogTiling(buf)).toBe("single-tile");
  });

  it("returns null when tile tags are present but no image dimensions", () => {
    // Can't determine single-tile without dimensions; treat as multi-tile.
    const buf = buildTiff([
      { tag: 322, value: 256 },
      { tag: 323, value: 256 },
    ]);
    expect(parseCogTiling(buf)).toBeNull();
  });

  it("handles SHORT-typed tags (type=3)", () => {
    // Build a buffer where ImageWidth/ImageLength are SHORT (type=3)
    const buf = buildTiff([
      { tag: 256, value: 512 },
      { tag: 257, value: 512 },
      { tag: 322, value: 256 },
      { tag: 323, value: 256 },
    ]);
    // Rewrite the type fields to SHORT for ImageWidth and ImageLength
    // Entry 0 at base=10: type at base+2
    buf.writeUInt16LE(3, 12); // ImageWidth → SHORT
    buf.writeUInt16LE(3, 24); // ImageLength → SHORT
    // SHORT values use read16, so the 2-byte value at the value field:
    // The value 512 = 0x200 was written as LONG (4 bytes), but as SHORT we
    // read only the first 2 bytes, which is still 0x200 in LE. Result is same.
    expect(parseCogTiling(buf)).toBeNull(); // 512×512 image, 256×256 tiles → 4 tiles
  });
});
