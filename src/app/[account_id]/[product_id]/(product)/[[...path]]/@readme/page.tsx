import { storage } from "@/lib";
import { MarkdownViewer } from "@/components";

interface ProductPathComponentProps {
  account_id: string;
  product_id: string;
}

interface PageProps {
  params: Promise<ProductPathComponentProps>;
}

export default async function ProductPathPage({ params }: PageProps) {
  const { account_id, product_id } = await params;

  let readme: string | undefined;
  try {
    await storage.headObject({
      account_id,
      product_id,
      object_path: "README.md",
    });
    const result = await storage.getObject({
      account_id,
      product_id,
      object_path: "README.md",
    });
    readme =
      result.data instanceof Buffer ? result.data.toString("utf-8") : undefined;
  } catch (error) {
    console.error("Error fetching README", error);
  }
  return readme && <MarkdownViewer content={readme} />;
}
