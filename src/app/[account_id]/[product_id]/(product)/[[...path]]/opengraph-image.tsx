import {
  OpenGraphImage,
  ogImageSize,
  ogImageContentType,
} from "@/components/og/OpenGraphImage";
import { productsTable } from "@/lib";

export const size = ogImageSize;
export const contentType = ogImageContentType;

export default async function Image({
  params,
}: {
  params: Promise<{
    account_id: string;
    product_id: string;
    path?: string[];
  }>;
}) {
  const { account_id, product_id, path } = await params;
  const product = await productsTable.fetchById(account_id, product_id);

  const productTitle = product?.title || "Untitled Product";
  const subtitle = path ? path.join("/") : product?.description || "";

  return OpenGraphImage({
    title: productTitle,
    subtitle,
  });
}
