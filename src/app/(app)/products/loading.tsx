import { PageHeader } from "@/components/layout";
import { ProductsSkeleton } from "@/components/features/products/ProductsSkeleton";

export default function ProductsLoading() {
  return (
    <>
      <PageHeader title="Products" />
      <ProductsSkeleton />
    </>
  );
}
