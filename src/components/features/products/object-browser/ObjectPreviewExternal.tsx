import "server-only";

import { LOGGER } from "@/lib/logging";
import { fileSourceUrl } from "@/lib/urls";
import { Code, Text } from "@radix-ui/themes";
import { getExtension } from "@/lib/files";
import { DuckDBConnection } from "@duckdb/node-api";
import { cache } from "react";
import { PreviewIframe } from "./PreviewIframe";

// ── COG tiling probe ─────────────────────────────────────────────────────────

type CogTilingInfo = "single-tile" | "striped" | "tiff";

/**
 * Parse the first IFD of a TIFF buffer and return tiling structure.
 * Returns "tiff" when the IFD lies beyond the probe — the file has its index
 * at the end rather than the beginning, which is incompatible with COG.
 * Returns null for multi-tile COGs and for anything that can't be parsed.
 */
export function parseCogTiling(buf: Buffer): CogTilingInfo | null {
  if (buf.length < 8) return null;

  const mark = buf.readUInt16BE(0);
  const littleEndian = mark === 0x4949;
  if (!littleEndian && mark !== 0x4d4d) return null;

  const read16 = (o: number) =>
    littleEndian ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
  const read32 = (o: number) =>
    littleEndian ? buf.readUInt32LE(o) : buf.readUInt32BE(o);

  const magic = read16(2);
  const isBigTiff = magic === 43;
  if (magic !== 42 && !isBigTiff) return null;

  const ifdOffset = isBigTiff ? read32(8) : read32(4);
  // A COG always puts its IFD at the very start of the file. If the offset
  // points past our probe the file wrote its IFD at the end — not a COG.
  if (ifdOffset + 2 > buf.length) return "tiff";

  // BigTIFF: 8-byte entry count; take the low 32 bits (high 32 are always 0).
  const entryCount = isBigTiff
    ? littleEndian
      ? read32(ifdOffset)
      : read32(ifdOffset + 4)
    : read16(ifdOffset);
  const entryStart = isBigTiff ? ifdOffset + 8 : ifdOffset + 2;
  const entrySize = isBigTiff ? 20 : 12;
  // BigTIFF: tag(2) + type(2) + count(8) + value(8); value starts at base+12.
  // Standard: tag(2) + type(2) + count(4) + value(4); value starts at base+8.
  const valStart = isBigTiff ? 12 : 8;

  let imageWidth = 0,
    imageLength = 0,
    tileWidth = 0,
    tileLength = 0;
  let hasTileWidth = false,
    hasTileLength = false,
    hasRowsPerStrip = false;

  const cap = Math.min(entryCount, 256);
  for (let i = 0; i < cap; i++) {
    const base = entryStart + i * entrySize;
    if (base + entrySize > buf.length) break;
    const tag = read16(base);
    const type = read16(base + 2);
    const vo = base + valStart;
    // SHORT (type 3) stores value as 2 bytes; everything else read as 4 bytes.
    const v = type === 3 ? read16(vo) : read32(vo);
    switch (tag) {
      case 256:
        imageWidth = v;
        break;
      case 257:
        imageLength = v;
        break;
      case 278:
        hasRowsPerStrip = true;
        break;
      case 322:
        tileWidth = v;
        hasTileWidth = true;
        break;
      case 323:
        tileLength = v;
        hasTileLength = true;
        break;
    }
  }

  if (hasTileWidth && hasTileLength && tileWidth > 0 && tileLength > 0) {
    if (
      imageWidth > 0 &&
      imageLength > 0 &&
      Math.ceil(imageWidth / tileWidth) === 1 &&
      Math.ceil(imageLength / tileLength) === 1
    ) {
      return "single-tile";
    }
    return null;
  }

  return hasRowsPerStrip ? "striped" : null;
}

const probeCogTiling = cache(async (sourceUrl: string): Promise<CogTilingInfo | null> => {
  try {
    const res = await fetch(sourceUrl, {
      headers: { Range: "bytes=0-8191" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok && res.status !== 206) return null;
    return parseCogTiling(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
});

// cache(): the remote parquet-schema probe is requested by both the
// "Open in new tab" link and the preview iframe in one render.
const isStacGeoParquet = cache(async (sourceUrl: string): Promise<boolean> => {
  let db: DuckDBConnection | undefined;
  try {
    db = await DuckDBConnection.create();

    // Vercel: /tmp is the only writable location
    await db.run("SET home_directory='/tmp'");
    await db.run("SET extension_directory='/tmp/duckdb_extensions'");

    const reader = await db.runAndReadAll(
      `SELECT count(*) > 0 FROM parquet_schema(?) WHERE name IN ('stac_version', 'geometry') GROUP BY file_name HAVING count(*) = 2`,
      [sourceUrl],
    );
    return reader.getRows().length > 0;
  } catch (error) {
    LOGGER.error(`Error checking for STAC GeoParquet: ${error}`, {
      operation: "isStacGeoParquet",
      context: "DuckDB query",
      metadata: { sourceUrl, error: (error as Error).toString() },
    });
    return false;
  } finally {
    // DuckDB connections should be closed to free up resources
    db?.closeSync();
  }
});

interface ObjectPreviewExternalProps {
  account_id: string;
  product_id: string;
  object_path: string;
}

export const getIframeSrc = async (
  sourceUrl: string,
  extension: string,
): Promise<string | null> => {
  const url = encodeURIComponent(sourceUrl);
  switch (extension) {
    case "pmtiles":
      return `https://pmtiles.io/#url=${url}&iframe=true`;
    case "parquet":
      if (await isStacGeoParquet(sourceUrl)) {
        return `https://developmentseed.org/stac-map?href=${url}`;
      }
      return `https://source-cooperative.github.io/parquet-table/?iframe=true&url=${url}`;
    case "csv":
    case "tsv":
      return `https://source-cooperative.github.io/csv-table/?iframe=true&url=${url}`;
    case "tif":
    case "tiff":
      return `https://source-cooperative.github.io/cog-viewer/?url=${url}`;
    case "avif":
    case "bmp":
    case "gif":
    case "jpg":
    case "jpeg":
    case "png":
    case "svg":
    case "webp":
      return `https://source-cooperative.github.io/image-viewer/?url=${url}`;
    case "pdf":
      return `https://source-cooperative.github.io/pdf-viewer/?url=${url}`;
    case "glb":
    case "gltf":
    case "obj":
    case "stl":
      return `https://source-cooperative.github.io/model-viewer/?url=${url}`;
    case "zip":
      return `https://source-cooperative.github.io/zip-viewer/?url=${url}`;
    case "json":
    case "jsonl":
    case "ndjson":
      return `https://source-cooperative.github.io/json-viewer/?url=${url}`;
    default:
      return null;
  }
};

const FILE_TYPE_LABELS: Record<string, string> = {
  tif: "COG",
  tiff: "COG",
  pmtiles: "PMTiles",
  jsonl: "Newline-delimited JSON",
  ndjson: "Newline-delimited JSON",
  glb: "binary glTF",
  gltf: "JSON glTF",
  obj: "Wavefront OBJ",
  stl: "STL mesh",
  fgb: "FlatGeobuf",
  geojson: "GeoJSON",
  gpkg: "GeoPackage",
  nc: "NetCDF",
  h5: "HDF5",
  las: "LAS point cloud",
  laz: "LAZ point cloud",
  copc: "Cloud-Optimized Point Cloud",
  bmp: "Bitmap",
  jpg: "JPEG",
  md: "Markdown",
  markdown: "Markdown",
  txt: "Text",
};

export async function fileTypeLabel(
  sourceUrl: string,
  extension: string,
): Promise<string> {
  if (extension === "tif" || extension === "tiff") {
    const tiling = await probeCogTiling(sourceUrl);
    if (tiling === "tiff") return "TIFF";
    if (tiling === "single-tile") return "COG · Single tile";
    if (tiling === "striped") return "COG · Striped";
    return "COG";
  }
  if (extension === "parquet") {
    return (await isStacGeoParquet(sourceUrl)) ? "STAC GeoParquet" : "Parquet";
  }
  return FILE_TYPE_LABELS[extension] ?? extension.toUpperCase();
}

export async function ObjectPreviewExternal(props: ObjectPreviewExternalProps) {
  const cloudUri = fileSourceUrl(props);
  const extension = getExtension(props.object_path);

  if (!extension) {
    return (
      <Text size="2" color="gray">
        No preview available
      </Text>
    );
  }

  const src = await getIframeSrc(cloudUri, extension);
  if (!src) {
    return (
      <p>
        No preview available for file type <Code>.{extension}</Code>.{" "}
        <a href="https://github.com/source-cooperative/source.coop/issues">
          Open an issue
        </a>{" "}
        if you would like support for this file type.
      </p>
    );
  }

  return (
    <PreviewIframe src={src} title={`Preview of ${props.object_path}`} />
  );
}
