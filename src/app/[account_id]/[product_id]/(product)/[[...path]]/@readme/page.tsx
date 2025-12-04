import { LOGGER, storage } from "@/lib";
import { SectionHeader } from "@/components";
import { MarkdownViewer } from "@/components/features/markdown";
import { Card } from "@radix-ui/themes";

interface ProductPathComponentProps {
  account_id: string;
  product_id: string;
  path?: string[];
}

interface PageProps {
  params: Promise<ProductPathComponentProps>;
}

export default async function ProductPathPage({ params }: PageProps) {
  const { account_id, product_id, path = [] } = await params;
  const object_path = [...path, "README.md"].join("/");
  const lookupDetails = {
    account_id,
    product_id,
    object_path,
  };

  let readme: string | undefined;
  try {
    await storage.headObject(lookupDetails);
    const result = await storage.getObject(lookupDetails);
    readme =
      result.data instanceof Buffer ? result.data.toString("utf-8") : undefined;
  } catch (error) {
    return null;
  }
  return (
    <Card mt="4">
      <SectionHeader title="README" />
      <MarkdownViewer content={readme!} />
    </Card>
  );
}
