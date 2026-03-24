import { PageHeader } from "@/components/layout";
import { ProductsList } from "@/components/features/products/ProductsList";
import { ProductsFilters } from "@/components/features/products/ProductsFilters";
import { getPaginatedProducts } from "@/lib/actions/products";
import { Badge, Box, Flex, Text } from "@radix-ui/themes";

export const metadata = {
  title: "Products | Source Cooperative",
  description: "Browse and discover public data products on Source.coop",
  openGraph: {
    title: "Products | Source Cooperative",
    description: "Browse and discover public data products on Source.coop",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Products | Source Cooperative",
    description: "Browse and discover public data products on Source.coop",
  },
};

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    tags?: string;
    next?: string;
  }>;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const { search, tags, next } = await searchParams;

  const filters = search || tags ? { search, tags } : undefined;
  const { products } = await getPaginatedProducts(20, next, undefined, undefined, filters);

  const hasActiveFilters = search || tags;

  return (
    <Box>
      <PageHeader title="Products" />

      <ProductsFilters />

      {hasActiveFilters && (
        <Flex gap="2" align="center" mb="3">
          <Text size="2" color="gray">
            Showing {products.length} products
          </Text>
          {search && (
            <Badge variant="soft" color="blue">
              Search: &ldquo;{search}&rdquo;
            </Badge>
          )}
          {tags && (
            <Badge variant="soft" color="green">
              Tags: {tags}
            </Badge>
          )}
        </Flex>
      )}

      <ProductsList products={products} />
    </Box>
  );
}
