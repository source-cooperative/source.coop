"use client";

import { Box } from "@radix-ui/themes";

interface ObjectPreviewProps {
  sourceUrl: string;
}

const getIframeSrc = (sourceUrl: string) => {
  switch (sourceUrl.split(".").pop()) {
    case "pmtiles":
      return `https://pmtiles.io/#url=${sourceUrl}&iframe=true`;
    case "parquet":
      return `https://source-cooperative.github.io/parquet-table/?iframe&url=${sourceUrl}`;
    default:
      return null;
  }
};

export function ObjectPreview({ sourceUrl: cloudUri }: ObjectPreviewProps) {
  const iframeSrc = getIframeSrc(cloudUri);
  if (iframeSrc) {
    return (
      <Box mt="4">
        <iframe width="100%" height="600px" style={{ border: "none" }} src={iframeSrc}>
          Your browser does not support iframes.
        </iframe>
      </Box>
    );
  }
}
