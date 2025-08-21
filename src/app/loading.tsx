import { ProductsSkeleton } from "@/components/features/products/ProductsSkeleton";
import { PageContainer, PageHeader } from "@/components/layout";

export default function HomeLoading() {
  return (
    <PageContainer>
      <PageHeader title="Featured Products" />
      <ProductsSkeleton />
    </PageContainer>
  );
}
