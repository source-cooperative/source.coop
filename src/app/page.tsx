/**
 * Home Page - Lists all repositories with efficient cursor-based pagination
 */

import { Container, Box, Heading } from "@radix-ui/themes";
import { ProductList } from "@/components/features/products";
import { getPaginatedProducts } from "@/lib/actions/products";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const previousCursor =
    typeof params.previous === "string" ? params.previous : undefined;
  const limit = 10;

  try {
    const result = await getPaginatedProducts(limit, cursor, previousCursor);

    return (
      <Container size="4" py="6">
        <Box>
          <Heading size="6" mb="4">
            Products
          </Heading>
          <ProductList
            products={result.products}
            hasNextPage={result.hasNextPage}
            hasPreviousPage={result.hasPreviousPage}
            nextCursor={result.nextCursor}
            previousCursor={result.previousCursor}
            currentCursor={cursor}
          />
        </Box>
      </Container>
    );
  } catch (error) {
    console.error("Failed to load products:", error);
    return (
      <Container size="4" py="6">
        <Box>
          <Heading size="6" mb="4">
            Products
          </Heading>
          <div>
            <p>Failed to load products. Please try again later.</p>
          </div>
        </Box>
      </Container>
    );
  }
}
