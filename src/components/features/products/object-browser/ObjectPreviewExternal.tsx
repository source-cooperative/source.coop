"use client";

import { fileSourceUrl } from "@/lib/urls";
import { Box } from "@radix-ui/themes";
import type { CSSProperties } from "react";

interface ObjectPreviewExternalProps {
  account_id: string;
  product_id: string;
  object_path: string;
}

const getIframeAttributes = (
  sourceUrl: string
): { src: string; style?: CSSProperties } | null => {
  switch (sourceUrl.split(".").pop()) {
    case "pmtiles":
      return {
        src: `https://pmtiles.io/#url=${sourceUrl}&iframe=true`,
        style: { border: "none" },
      };
    case "parquet":
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

export function ObjectPreviewExternal(props: ObjectPreviewExternalProps) {
  const cloudUri = fileSourceUrl(props);
  const iframeProps = getIframeAttributes(cloudUri);

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
