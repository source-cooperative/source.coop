import { PageHeader } from "@/components/layout";
import { ProductsSkeleton } from "@/components/features/products/ProductsSkeleton";
import { useTranslations } from "next-intl";

export default function ProductsLoading() {
  const t = useTranslations("ProductsPage");
  return (
    <>
      <PageHeader title={t("title")} />
      <ProductsSkeleton />
    </>
  );
}
