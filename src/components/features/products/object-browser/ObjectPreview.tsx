import {
  canRenderInternally,
  ObjectPreviewInternal,
} from "./ObjectPreviewInternal";
import { ObjectPreviewExternal } from "./ObjectPreviewExternal";
import { Box } from "@radix-ui/themes";

interface ObjectPreviewProps {
  account_id: string;
  product_id: string;
  object_path: string;
}

export async function ObjectPreview(props: ObjectPreviewProps) {
  const Component = canRenderInternally(props.object_path)
    ? ObjectPreviewInternal
    : ObjectPreviewExternal;

  return (
    <Box mt="4">
      <Component {...props} />
    </Box>
  );
}
