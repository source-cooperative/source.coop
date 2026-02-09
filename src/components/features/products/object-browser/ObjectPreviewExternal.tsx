import { fileSourceUrl } from "@/lib/urls";
import { Box, Code } from "@radix-ui/themes";
import type { CSSProperties } from "react";
import { getExtension } from "@/lib/files";

interface ObjectPreviewExternalProps {
  account_id: string;
  product_id: string;
  object_path: string;
}

const getIframeAttributes = (
  sourceUrl: string,
  extension?: string,
): { src: string; style?: CSSProperties } | null => {
  switch (extension) {
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
  const extension = getExtension(cloudUri);
  const encodedCloudUri = encodeURIComponent(cloudUri);
  const iframeProps = getIframeAttributes(encodedCloudUri, extension);

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
        style={style}
        src={src}
        title={`Preview of ${props.object_path}`}
        sandbox="allow-scripts allow-downloads allow-same-origin"
        referrerPolicy="no-referrer"
        loading="lazy"
      >
        Your browser does not support iframes.
      </iframe>
    </Box>
  );
}
