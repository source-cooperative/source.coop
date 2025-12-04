import {
  OpenGraphImage,
  ogImageSize,
  ogImageContentType,
} from "@/components/og/OpenGraphImage";

export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image() {
  return OpenGraphImage({
    title: "Product Not Found",
    subtitle: undefined,
  });
}
