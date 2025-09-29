"use client";

import { Box } from "@radix-ui/themes";
import type { CSSProperties } from "react";
import { SectionHeader } from "@/components/core";

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
        src: `https://source-cooperative.github.io/parquet-table/?iframe&url=${sourceUrl}`,
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
      <Box mt="4">
        <SectionHeader title="Object preview">
          <iframe width="100%" height="600px" style={style} src={src}>
            Your browser does not support iframes.
          </iframe>
        </SectionHeader>
      </Box>
    );
  }
}
