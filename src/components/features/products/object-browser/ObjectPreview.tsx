import "server-only";

import { Box } from "@radix-ui/themes";
import type { CSSProperties } from "react";
import { DuckDBConnection } from "@duckdb/node-api";

interface ObjectPreviewProps {
  sourceUrl: string;
}

const isStacGeoParquet = async (sourceUrl: string): Promise<boolean> => {
  try {
    const db = await DuckDBConnection.create();
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
    console.error("Error checking for STAC GeoParquet:", error);
    return false;
  }
};

const getIframeAttributes = async (
  sourceUrl: string,
): Promise<{ src: string; style?: CSSProperties } | null> => {
  switch (sourceUrl.split(".").pop()) {
    case "pmtiles":
      return {
        src: `https://pmtiles.io/#url=${sourceUrl}&iframe=true`,
        style: { border: "none" },
      };
    case "parquet":
      if (await isStacGeoParquet(sourceUrl)) {
        return {
          src: `https://developmentseed.org/stac-map?href=${sourceUrl}`,
          style: { border: "1px solid var(--gray-5)" },
        };
      }
      return {
        src: `https://source-cooperative.github.io/parquet-table/?iframe=true&url=${sourceUrl}`,
        style: { border: "1px solid var(--gray-5)" },
      };
    case "csv":
    case "tsv":
      return {
        src: `https://source-cooperative.github.io/csv-table/?iframe=true&url=${sourceUrl}`,
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
        src: `https://source-cooperative.github.io/image-viewer/?url=${sourceUrl}`,
        style: { border: "1px solid var(--gray-5)" },
      };
    case "glb":
    case "gltf":
    case "obj":
    case "stl":
      return {
        src: `https://source-cooperative.github.io/model-viewer/?url=${sourceUrl}`,
        style: { border: "1px solid var(--gray-5)" },
      };
    case "zip":
      return {
        src: `https://source-cooperative.github.io/zip-viewer/?url=${sourceUrl}`,
        style: { border: "1px solid var(--gray-5)" },
      };
    default:
      return null;
  }
};

export async function ObjectPreview({
  sourceUrl: cloudUri,
}: ObjectPreviewProps) {
  const iframeProps = await getIframeAttributes(cloudUri);
  if (iframeProps) {
    const { src, style } = iframeProps;
    return (
      <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
        <iframe width="100%" height="600px" style={style} src={src}>
          Your browser does not support iframes.
        </iframe>
      </Box>
    );
  }
}
