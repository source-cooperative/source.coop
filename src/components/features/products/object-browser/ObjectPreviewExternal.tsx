import "server-only";

import { LOGGER } from "@/lib";
import { fileSourceUrl } from "@/lib/urls";
import { Box, Code } from "@radix-ui/themes";
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
      `
        SELECT stac_version
        FROM read_parquet(?)
        WHERE geometry IS NOT NULL
        LIMIT 1
      `,
      [sourceUrl],
    );
    const [[stac_version] = []] = reader.getRows();
    return Boolean(stac_version);
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

const getIframeAttributes = async (
  sourceUrl: string,
  extension: string,
): Promise<{ src: string; style?: CSSProperties } | null> => {
  const url = encodeURIComponent(sourceUrl);
  switch (extension) {
    case "pmtiles":
      return {
        src: `https://pmtiles.io/#url=${url}&iframe=true`,
        style: { border: "none" },
      };
    case "parquet":
      if (await isStacGeoParquet(sourceUrl)) {
        return {
          src: `https://developmentseed.org/stac-map?href=${url}`,
          style: { border: "1px solid var(--gray-5)" },
        };
      }
      return {
        src: `https://source-cooperative.github.io/parquet-table/?iframe=true&url=${url}`,
        style: { border: "1px solid var(--gray-5)" },
      };
    case "csv":
    case "tsv":
      return {
        src: `https://source-cooperative.github.io/csv-table/?iframe=true&url=${url}`,
        style: { border: "1px solid var(--gray-5)" },
      };
    case "avif":
    case "bmp":
    case "gif":
    case "jpg":
    case "jpeg":
    case "svg":
    case "tif":
    case "tiff":
    case "webp":
      return {
        src: `https://source-cooperative.github.io/image-viewer/?url=${url}`,
        style: { border: "1px solid var(--gray-5)" },
      };
    case "glb":
    case "gltf":
    case "obj":
    case "stl":
      return {
        src: `https://source-cooperative.github.io/model-viewer/?url=${url}`,
        style: { border: "1px solid var(--gray-5)" },
      };
    case "zip":
      return {
        src: `https://source-cooperative.github.io/zip-viewer/?url=${url}`,
        style: { border: "1px solid var(--gray-5)" },
      };
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

  const iframeProps = await getIframeAttributes(cloudUri, extension);
  if (!iframeProps) {
    return (
      <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
        <p>
          No preview available for file type <Code>.{extension}</Code>.{" "}
          <a href="https://github.com/source-cooperative/source.coop/issues">
            Open an issue
          </a>{" "}
          if you would like support for this file type.
        </p>
      </Box>
    );
  }

  const { src, style } = iframeProps;
  return (
    <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
      <iframe
        width="100%"
        height="600px"
        allow="fullscreen"
        style={style}
        src={src}
        title={`Preview of ${props.object_path}`}
        loading="lazy"
      >
        Your browser does not support iframes.
      </iframe>
    </Box>
  );
}
