import { Container, Box, Heading } from "@radix-ui/themes";
import { ProductList } from "@/components/features/products";
import { productsTable } from "@/lib/clients/database";

export default async function HomePage() {
  try {
    const result = await productsTable.listPublic(10);

    return (
      <Container size="4" py="6">
        <Box>
          <Heading size="6" mb="4">
            Products
          </Heading>
          <ProductList products={result.products} />
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
