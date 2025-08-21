import { ProductsSkeleton } from "@/components/features/products/ProductsSkeleton";
import { PageContainer, PageHeader } from "@/components/layout";

export default function HomeLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Featured Products"
        description="Discover the latest and most popular data products from the Source.coop community."
      />
      <ProductsSkeleton />
    </PageContainer>
  );
}
