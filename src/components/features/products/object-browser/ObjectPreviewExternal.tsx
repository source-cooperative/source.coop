import "server-only";

import { LOGGER } from "@/lib/logging";
import { fileSourceUrl } from "@/lib/urls";
import { Text } from "@radix-ui/themes";
import { getExtension } from "@/lib/files";
import { DuckDBConnection } from "@duckdb/node-api";
import { cache } from "react";
import { PreviewIframe } from "./PreviewIframe";

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

export async function fileTypeLabel(
  sourceUrl: string,
  extension: string,
): Promise<string> {
  switch (extension) {
    case "tif":
    case "tiff":
      return "COG";
    case "parquet":
      return (await isStacGeoParquet(sourceUrl)) ? "STAC GeoParquet" : "Parquet";
    case "pmtiles":
      return "PMTiles";
    case "csv":
      return "CSV";
    case "tsv":
      return "TSV";
    case "json":
      return "JSON";
    case "jsonl":
    case "ndjson":
      return "Newline-delimited JSON";
    case "pdf":
      return "PDF";
    case "glb":
      return "binary glTF";
    case "gltf":
      return "JSON glTF";
    case "obj":
      return "Wavefront OBJ";
    case "stl":
      return "STL mesh";
    case "fgb":
      return "FlatGeobuf";
    case "geojson":
      return "GeoJSON";
    case "gpkg":
      return "GeoPackage";
    case "nc":
      return "NetCDF";
    case "h5":
    case "hdf5":
      return "HDF5";
    case "las":
      return "LAS point cloud";
    case "laz":
      return "LAZ point cloud";
    case "copc":
      return "Cloud-Optimized Point Cloud";
    case "zip":
      return "ZIP";
    case "avif":
    case "gif":
    case "svg":
    case "webp":
      return extension.toUpperCase();
    case "bmp":
      return "Bitmap";
    case "jpg":
    case "jpeg":
      return "JPEG";
    case "png":
      return "PNG";
    case "md":
    case "markdown":
      return "Markdown";
    case "txt":
      return "Text";
    default:
      return extension.toUpperCase();
  }
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
      <Text size="2" color="gray">
        No preview available
      </Text>
    );
  }

  return (
    <PreviewIframe src={src} title={`Preview of ${props.object_path}`} />
  );
}
