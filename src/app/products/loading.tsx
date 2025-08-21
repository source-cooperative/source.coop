import { PageContainer, PageHeader } from "@/components/layout";
import { ProductsSkeleton } from "@/components/features/products/ProductsSkeleton";

export default function ProductsLoading() {
  return (
    <PageContainer>
      <PageHeader title="Products" />
      <ProductsSkeleton />
    </PageContainer>
  );
}
