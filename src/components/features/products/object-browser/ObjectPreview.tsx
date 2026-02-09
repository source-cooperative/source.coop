import {
  canRenderInternally,
  ObjectPreviewInternal,
} from "./ObjectPreviewInternal";
import { ObjectPreviewExternal } from "./ObjectPreviewExternal";
import { Box, Skeleton } from "@radix-ui/themes";

interface ObjectPreviewProps {
  account_id: string;
  product_id: string;
  object_path: string;
}

export function ObjectPreview(props: ObjectPreviewProps) {
  if (canRenderInternally(props.object_path)) {
    return <ObjectPreviewInternal {...props} />;
  } else {
    return <ObjectPreviewExternal {...props} />;
  }
}

export function ObjectPreviewLoading() {
  return (
    <Skeleton>
      <Box mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
        <Box width="100%" height="600px" />
      </Box>
    </Skeleton>
  );
}
