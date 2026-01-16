"use client";

import { Box } from "@radix-ui/themes";
import type { CSSProperties } from "react";

interface ObjectPreviewProps {
  sourceUrl: string;
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
    case "tiff":
    case "webp":
      return {
        src: `https://source-cooperative.github.io/image-viewer/?url=${sourceUrl}`,
        style: { border: "1px solid var(--gray-5)" },
      };
    default:
      return null;
  }
};

export function ObjectPreview({ sourceUrl: cloudUri }: ObjectPreviewProps) {
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
