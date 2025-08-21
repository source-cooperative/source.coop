import { PageContainer, PageHeader } from "@/components/layout";
import { ProductsSkeleton } from "@/components/features/products/ProductsSkeleton";

export default function ProductsLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Products"
        description="Discover and explore public data products from the Source.coop community."
        headingSize="8"
      />
      <ProductsSkeleton />
    </PageContainer>
  );
}
