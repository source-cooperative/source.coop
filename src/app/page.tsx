/**
 * Home Page - Lists all repositories
 * 
 * KEEP IT SIMPLE:
 * 1. No URL params needed (root route /)
 * 2. Get data -> Transform if needed -> Render
 * 3. Trust your types, avoid complex validation
 * 4. Let Next.js handle errors (404, 500, etc.)
 * 5. No helper functions unless truly needed
 */

// src/app/page.tsx
import { Container, Box, Heading } from '@radix-ui/themes';
import { ProductList } from '@/components/features/products';
import type { Product_v2 as Product } from '@/types/product_v2';
import { addAccountToProducts, fetchPublicProducts } from '@/lib/db/operations_v2';

// Server action for data fetching
async function getProducts(): Promise<Product[]> {
  'use server';
  const { products: productsWithoutAccounts } = await fetchPublicProducts();
  return addAccountToProducts(productsWithoutAccounts);
}

export default async function HomePage() {
  const products = await getProducts();
  
  return (
    <Container size="4" py="6">
      <Box>
        <Heading size="6" mb="4">Products</Heading>
        <ProductList products={products} />
      </Box>
    </Container>
  );
}