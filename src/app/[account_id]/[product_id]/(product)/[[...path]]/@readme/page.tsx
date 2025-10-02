import { LOGGER, storage } from "@/lib";
import { MarkdownViewer } from "@/components/features/markdown";

interface ProductPathComponentProps {
  account_id: string;
  product_id: string;
}

interface PageProps {
  params: Promise<ProductPathComponentProps>;
}

export default async function ProductPathPage({ params }: PageProps) {
  const { account_id, product_id } = await params;
  const lookupDetails = {
    account_id,
    product_id,
    object_path: "README.md",
  };

  let readme: string | undefined;
  try {
    await storage.headObject(lookupDetails);
    const result = await storage.getObject(lookupDetails);
    readme =
      result.data instanceof Buffer ? result.data.toString("utf-8") : undefined;
  } catch (error) {
    LOGGER.debug("Error fetching README", {
      operation: "ProductPathPage",
      context: "README fetch",
      metadata: { ...lookupDetails, error },
    });
  }
  return readme && <MarkdownViewer content={readme} />;
}
