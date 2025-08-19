import { Container, Heading, Text, Box } from "@radix-ui/themes";
import { ProductsList } from "@/components/features/products/ProductsList";
import { ProductsFilters } from "@/components/features/products/ProductsFilters";
import { getProducts } from "@/lib/actions/products";
import { Badge, Flex } from "@radix-ui/themes";

export const metadata = {
  title: "Products | Source.coop",
  description: "Browse and discover public data products on Source.coop",
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

  // Fetch products on the server
  const result = await getProducts({
    search,
    tags,
    cursor: next,
    limit: 20,
  });

  const hasActiveFilters = search || tags;

  return (
    <Container size="4" py="6">
      <Box>
        <Heading size="6" mb="2">
          Products
        </Heading>
        <Text as="p" size="3" color="gray" mb="6">
          Discover and explore public data products from the Source.coop
          community.
        </Text>

        {/* Search and Filters */}
        <Box mb="6">
          <ProductsFilters />

          {hasActiveFilters && (
            <Flex gap="2" align="center" mb="3">
              <Text size="2" color="gray">
                Showing {result.products.length} of {result.totalCount} products
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
        </Box>

        {/* Products List */}
        <ProductsList products={result.products} />
      </Box>
    </Container>
  );
}
