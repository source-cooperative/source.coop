import { PageContainer, PageHeader } from "@/components/layout";
import { ProductsList } from "@/components/features/products/ProductsList";
import { getProducts } from "@/lib/actions/products";

export const metadata = {
  title: "Featured Products | Source.coop",
  description: "Browse and discover public data products on Source.coop",
};

export default async function HomePage() {
  // Fetch featured products on the server
  const result = await getProducts({
    featuredOnly: true,
    limit: 10,
  });

  return (
    <PageContainer>
      <PageHeader
        title="Featured Products"
        description="Discover the latest and most popular data products from the Source.coop community."
      />
      <ProductsList products={result.products} />
    </PageContainer>
  );
}
