import { Box, Flex, Link } from "@radix-ui/themes";
import { ExternalLinkIcon } from "@radix-ui/react-icons";
import type { CSSProperties } from "react";

interface PreviewIframeProps {
  src: string;
  style?: CSSProperties;
  title: string;
}

/**
 * Shared wrapper for an embedded external viewer (COG, image, zarr, ...). Keeps
 * the frame size, sandbox affordances, divider styling, and the "Open in new
 * tab" escape hatch identical across every preview that embeds a
 * `source-cooperative.github.io` viewer.
 */
export function PreviewIframe({ src, style, title }: PreviewIframeProps) {
  return (
    <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
      <Flex justify="end" mb="2">
        <Link href={src} target="_blank" rel="noopener noreferrer" size="1">
          <Flex align="center" gap="1">
            Open in new tab
            <ExternalLinkIcon width="14" height="14" />
          </Flex>
        </Link>
      </Flex>
      <iframe
        width="100%"
        height="600px"
        allow="fullscreen"
        style={style}
        src={src}
        title={title}
        loading="lazy"
      >
        Your browser does not support iframes.
      </iframe>
    </Box>
  );
}
