import { Container, Heading, Text, Box } from "@radix-ui/themes";
import { ProductsSkeleton } from "@/components/features/products/ProductsSkeleton";

export default function HomeLoading() {
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
        <ProductsSkeleton showFilters={false} />
      </Box>
    </Container>
  );
}
