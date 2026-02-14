import { Box } from "@radix-ui/themes";
import { LOGGER, storage } from "@/lib";
import { MarkdownViewer } from "@/components/features/markdown/MarkdownViewer";
import { TextViewer } from "@/components/features/text/TextViewer";
import { getExtension } from "@/lib/files";

const MAX_PREVIEW_SIZE = 10 * 1024 * 1024; // 10 MB

interface ObjectPreviewInternalProps {
  account_id: string;
  product_id: string;
  object_path: string;
}

export const canRenderInternally = (object_path: string): boolean => {
  const extension = getExtension(object_path);
  switch (extension) {
    case "md":
    case "markdown":
    case "txt":
      return true;
    default:
      return false;
  }
};

export async function ObjectPreviewInternal(props: ObjectPreviewInternalProps) {
  let content: string | undefined;
  try {
    const head = await storage.headObject(props);
    if (head.contentLength === undefined) {
      LOGGER.debug(`Object has no content`, {
        operation: "ObjectPreviewInternal",
        context: "object fetch",
        metadata: { ...props },
      });
      return null;
    }
    if (head.contentLength > MAX_PREVIEW_SIZE) {
      LOGGER.debug(
        `Object too large to preview (${head.contentLength} bytes)`,
        {
          operation: "ObjectPreviewInternal",
          context: "object fetch",
          metadata: { ...props, contentLength: head.contentLength },
        },
      );
      return null;
    }
    const result = await storage.getObject(props);
    content =
      result.data instanceof Buffer ? result.data.toString("utf-8") : undefined;
  } catch (error) {
    LOGGER.debug(`Error fetching ${JSON.stringify(props)}`, {
      operation: "ObjectPreviewInternal",
      context: "object fetch",
      metadata: { ...props, error: (error as Error).toString() },
    });
  }
  if (content === undefined) {
    return null;
  }

  const extension = getExtension(props.object_path);
  return (
    <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
      {extension === "md" || extension === "markdown" ? (
        <MarkdownViewer content={content} />
      ) : (
        <TextViewer content={content} />
      )}
    </Box>
  );
}
