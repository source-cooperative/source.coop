import {
  canRenderInternally,
  ObjectPreviewInternal,
} from "./ObjectPreviewInternal";
import { ObjectPreviewExternal } from "./ObjectPreviewExternal";

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
