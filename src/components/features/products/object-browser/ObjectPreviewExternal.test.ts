/** @jest-environment node */

jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@duckdb/node-api", () => ({
  DuckDBConnection: { create: jest.fn() },
}));
jest.mock("@/lib/logging", () => ({ LOGGER: { error: jest.fn() } }));
jest.mock("@/lib/urls", () => ({ fileSourceUrl: jest.fn() }));
jest.mock("@/lib/files", () => ({ getExtension: jest.fn() }));
jest.mock("./PreviewIframe", () => ({}));

import { fileTypeLabel } from "./ObjectPreviewExternal";
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
