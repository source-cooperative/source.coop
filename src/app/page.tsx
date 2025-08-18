"use client";

import { Container, Box, Heading, Text } from "@radix-ui/themes";
import { ProductList } from "@/components/features/products";
import { useApi } from "@/hooks/useApi";
import type { Product } from "@/types";
import styles from "@/components/features/products/ProductList.module.css";

export default function HomePage() {
  const { data, loading, error } = useApi<{ products: Product[] }>({
    url: "/api/v1/products/featured",
  });

  return (
    <Container size="4" py="6">
      <Box>
        <Heading size="6" mb="4">
          Featured Products
        </Heading>
        {loading ? (
          <Text as="p" className={styles.empty}>
            Loading featured products...
          </Text>
        ) : error ? (
          <Text as="p" color="red" className={styles.empty}>
            Failed to load featured products. Please try again later.
          </Text>
        ) : (
          <ProductList products={data?.products || []} />
        )}
      </Box>
    </Container>
  );
}
