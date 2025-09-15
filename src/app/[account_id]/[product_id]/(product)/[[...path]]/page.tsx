import { Box, Card } from "@radix-ui/themes";
import { Suspense } from "react";
import { SectionHeader } from "@/components/core";
import { BreadcrumbNav } from "@/components/display";
import { DirectoryListLoading } from "./loading";
import { ProductPathComponent } from "@/components/features/products/object-browser/ProductPath";
import { productsTable } from "@/lib/clients/database";

export async function generateMetadata({ params }: PageProps) {
  const { account_id, product_id, path } = await params;
  const product = await productsTable.fetchById(account_id, product_id);
  let title = product?.title || "Untitled Product";
  if (path) {
    title = `${path.join("/")} | ${title}`;
  }
  const description = product?.description || "A product on Source.coop";
  return { title, description };
}

interface ProductPathComponentProps {
  account_id: string;
  product_id: string;
  path?: string[];
}

interface PageProps {
  params: Promise<ProductPathComponentProps>;
}

export default async function ProductPathPage({ params }: PageProps) {
  let { account_id, product_id, path } = await params;
  path = path?.map((p) => decodeURIComponent(p)) || [];

  return (
    <Card mt="4">
      <SectionHeader title="Product Contents">
        <Box
          pb="3"
          mb="3"
          style={{
            borderBottom: "1px solid var(--gray-5)",
          }}
        >
          <BreadcrumbNav path={path} baseUrl={`/${account_id}/${product_id}`} />
        </Box>
      </SectionHeader>

      <Suspense fallback={<DirectoryListLoading />}>
        <ProductPathComponent
          account_id={account_id}
          product_id={product_id}
          objectPath={path.join("/")}
        />
      </Suspense>
    </Card>
  );
}
