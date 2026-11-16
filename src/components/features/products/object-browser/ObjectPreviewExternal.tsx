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

  // BigTIFF needs 16 header bytes (II/MM + 43 + offset-bytesize + 0 + 8-byte IFD offset).
  if (isBigTiff && buf.length < 16) return null;

  // BigTIFF: the 8-byte IFD offset sits at byte 8. Take the low 32 bits:
  // LE → byte 8; BE → byte 12 (high 32 bits come first in big-endian).
  const ifdOffset = isBigTiff
    ? (littleEndian ? read32(8) : read32(12))
    : read32(4);

  // A COG always puts its IFD at the very start of the file. If the offset
  // points past our probe the file wrote its IFD at the end — not a COG.
  // BigTIFF IFDs begin with an 8-byte entry count; standard TIFFs use 2.
  const ifdCountSize = isBigTiff ? 8 : 2;
  if (ifdOffset + ifdCountSize > buf.length) return "tiff";

  // BigTIFF: 8-byte entry count; take the low 32 bits.
  const entryCount = isBigTiff
    ? (littleEndian ? read32(ifdOffset) : read32(ifdOffset + 4))
    : read16(ifdOffset);
  const entryStart = isBigTiff ? ifdOffset + 8 : ifdOffset + 2;
  const entrySize = isBigTiff ? 20 : 12;

  // Value field offset within an IFD entry:
  //   Standard: tag(2)+type(2)+count(4)+value(4) → value at +8
  //   BigTIFF:  tag(2)+type(2)+count(8)+value(8) → value at +12
  // For BigTIFF BE, LONG8 (type 16) values store low 32 bits at +4 within the
  // field (+16 from base). LONG (type 4) and SHORT (type 3) start at +0 of
  // the field for both endiannesses.
  const vBase = isBigTiff ? 12 : 8;

  let imageWidth = 0, imageLength = 0, tileWidth = 0, tileLength = 0;
  let hasRowsPerStrip = false;

  for (let i = 0; i < entryCount; i++) {
    const base = entryStart + i * entrySize;
    if (base + entrySize > buf.length) break;
    const tag = read16(base);
    const type = read16(base + 2);
    // SHORT (type 3): 2 bytes left-justified in the value field.
    // LONG8 (type 16) in BE BigTIFF: low 32 bits are at offset +4 within field.
    // Everything else: 32-bit value at the start of the value field.
    const v =
      type === 3
        ? read16(base + vBase)
        : isBigTiff && !littleEndian && type === 16
          ? read32(base + vBase + 4)
          : read32(base + vBase);
    switch (tag) {
      case 256: imageWidth = v; break;
      case 257: imageLength = v; break;
      case 278: hasRowsPerStrip = true; break;
      case 322: tileWidth = v; break;
      case 323: tileLength = v; break;
    }
  }

  if (tileWidth > 0 && tileLength > 0) {
    if (imageWidth > 0 && imageLength > 0 && imageWidth <= tileWidth && imageLength <= tileLength) {
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
    if (res.status !== 206) {
      await res.body?.cancel();
      return null;
    }
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
      if ((await probeCogTiling(sourceUrl)) === "tiff") return null;
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
