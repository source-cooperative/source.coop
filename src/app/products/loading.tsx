import { Container, Heading, Text, Box } from "@radix-ui/themes";
import { ProductsSkeleton } from "@/components/features/products/ProductsSkeleton";

export default function ProductsLoading() {
  return (
    <Container size="4" py="6">
      <Box>
        <Heading size="8" mb="2">
          Products
        </Heading>
        <Text as="p" size="3" color="gray" mb="6">
          Discover and explore public data products from the Source.coop
          community.
        </Text>
        <ProductsSkeleton />
      </Box>
    </Container>
  );
}
