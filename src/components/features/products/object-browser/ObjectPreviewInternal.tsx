import { Box } from "@radix-ui/themes";
import { LOGGER, storage } from "@/lib";
import { MarkdownViewer } from "@/components/features/markdown";

interface ObjectPreviewInternalProps {
  account_id: string;
  product_id: string;
  object_path: string;
}

export const canRenderInternally = (object_path: string): boolean => {
  const extension = object_path.split(".").pop()
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
    await storage.headObject(props);
    const result = await storage.getObject(props);
    content =
      result.data instanceof Buffer ? result.data.toString("utf-8") : undefined;
  } catch (error) {
    LOGGER.debug(`Error fetching ${JSON.stringify(props)}`, {
      operation: "ObjectPreviewInternal",
      context: "object fetch",
      metadata: { ...props, error: (error as Error).toString() },
    });
    return null;
  }
  return (
    <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
      <MarkdownViewer content={content!} />
    </Box>
  );
}
