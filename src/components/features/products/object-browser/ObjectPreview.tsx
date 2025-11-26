"use client";
import { Box } from "@radix-ui/themes";
import { useEffect, useState, type CSSProperties } from "react";
import { MarkdownViewer } from "@/components/features/markdown";

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
    default:
      return null;
  }
};

function AsyncMarkdownViewer({ sourceUrl }: { sourceUrl: string }) {
  const [readme, setReadme] = useState<string>("Loading...");
  useEffect(() => {
    fetch(sourceUrl)
      .then((res) => res.text())
      .then((data) => setReadme(data))
      .catch(() => setReadme("Error loading README"));
  }, [sourceUrl]);

  return <MarkdownViewer content={readme} />;
}

export function ObjectPreview({ sourceUrl }: ObjectPreviewProps) {
  if (sourceUrl.endsWith(".md") || sourceUrl.endsWith(".markdown")) {
    return (
      <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
        <AsyncMarkdownViewer sourceUrl={sourceUrl} />
      </Box>
    );
  }
  const iframeProps = getIframeAttributes(sourceUrl);
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
