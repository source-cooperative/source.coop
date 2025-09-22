"use client";

import { Box } from "@radix-ui/themes";
import { useTheme } from 'next-themes';

interface ObjectPreviewProps {
  sourceUrl: string;
}

const getIframeSrc = ({sourceUrl, theme}: ObjectPreviewProps & {theme: 'dark' | 'light'}) => {
  switch (sourceUrl.split(".").pop()) {
    case "pmtiles":
      // TODO(SL): add support for theme param in pmtiles.io?
      return `https://pmtiles.io/#url=${sourceUrl}&iframe=true`;
    case "parquet":
      return `https://source-cooperative.github.io/parquet-table/?url=${sourceUrl}&iframe=true&theme=${theme}`;
    default:
      return null;
  }
};

export function ObjectPreview({ sourceUrl }: ObjectPreviewProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';

  const iframeSrc = getIframeSrc({ sourceUrl, theme });
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
