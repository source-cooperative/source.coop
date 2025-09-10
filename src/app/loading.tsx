import { ProductsSkeleton } from "@/components/features/products/ProductsSkeleton";
import { PageHeader } from "@/components/layout";

export default function HomeLoading() {
  return (
    <>
      <PageHeader title="Featured Products" />
      <ProductsSkeleton />
    </>
  );
}
