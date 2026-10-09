import { PageHeader } from "@/components/layout";
import { ProductsList } from "@/components/features/products/ProductsList";
import { ProductsFilters } from "@/components/features/products/ProductsFilters";
import { getPageSession } from "@/lib";
import { listProducts } from "@/lib/operations/products";
import { notFound } from "next/navigation";
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
    cursor?: string;
    previous?: string;
    featured?: string;
  }>;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const { search, tags, cursor, previous, featured } = await searchParams;

  const featuredOnly = featured === "1";
  const session = await getPageSession();
  const query = {
    q: search,
    tags,
    featured: featuredOnly ? "true" : undefined,
    limit: 100,
  };
  // A cursor that's no longer one (a stale bookmark) starts over at page one.
  let result = await listProducts(session, { ...query, cursor });
  if (!result.ok && cursor) result = await listProducts(session, query);
  // Only a hand-edited query, such as a repeated ?tags=, gets here.
  if (!result.ok) notFound();
  const { items: products, next_cursor } = result.value;

  const hasActiveFilters = search || tags || featuredOnly;

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
          {featuredOnly && (
            <Badge variant="soft" color="orange">
              Featured
            </Badge>
          )}
        </Flex>
      )}

      <ProductsList
        products={products}
        pagination={{
          hasNextPage: !!next_cursor,
          hasPreviousPage: !!cursor,
          nextCursor: next_cursor ?? undefined,
          previousCursor: previous,
          currentCursor: cursor,
        }}
      />
    </Box>
  );
}
