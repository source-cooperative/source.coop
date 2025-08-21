import { Container, Heading, Text, Box } from "@radix-ui/themes";
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
    <Container size="4" py="6">
      <Box>
        <Heading size="6" mb="2">
          Featured Products
        </Heading>
        <Text as="p" size="3" color="gray" mb="6">
          Discover the latest and most popular data products from the
          Source.coop community.
        </Text>
        <ProductsList
          products={result.products}
          // No pagination for featured products
        />
      </Box>
    </Container>
  );
}
