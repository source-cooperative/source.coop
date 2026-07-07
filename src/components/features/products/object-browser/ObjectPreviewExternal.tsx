import "server-only";

import { LOGGER } from "@/lib";
import { fileSourceUrl } from "@/lib/urls";
import { Code, Flex, Link } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import type { CSSProperties } from "react";
import { getExtension } from "@/lib/files";
import { DuckDBConnection } from "@duckdb/node-api";

const isStacGeoParquet = async (sourceUrl: string): Promise<boolean> => {
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
};

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

export async function ObjectPreviewExternal(props: ObjectPreviewExternalProps) {
  const cloudUri = fileSourceUrl(props);
  const extension = getExtension(props.object_path);

  if (!extension) {
    return null;
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
    <iframe
      width="100%"
      height="600px"
      allow="fullscreen"
      style={{ border: "1px solid var(--gray-5)" }}
      src={src}
      title={`Preview of ${props.object_path}`}
      loading="lazy"
    >
      Your browser does not support iframes.
    </iframe>
  );
}
