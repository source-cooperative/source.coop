/**
 * Product Page - Displays a product and its contents
 * 
 * KEEP IT SIMPLE:
 * 1. URL params are known values (/[account_id]/[product_id])
 * 2. Get data -> Transform if needed -> Render
 * 3. Trust your types, avoid complex validation
 * 4. Let Next.js handle errors (404, 500, etc.)
 * 5. No helper functions unless truly needed
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Container, Box } from '@radix-ui/themes';
import { productsTable } from "@/lib/clients/database";
import { ProductHeader } from '@/components/features/products';
import { ObjectBrowser } from '@/components/features/products';

interface ProductPageProps {
  params: Promise<{
    account_id: string;
    product_id: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  // Await params before destructuring as required by Next.js 15+
  const { account_id, product_id } = await params;
  
  try {
    const product = await productsTable.fetchById(account_id, product_id);
    if (!product) {
      return notFound();
    }

    return (
      <Container>
        <ProductHeader product={product} />

        <Box mt="4">
          <ObjectBrowser product={product} initialPath="" />
        </Box>
      </Container>
    );
  } catch (error) {
    console.error('Error fetching product:', error);
    return notFound();
  }
}

// Basic metadata
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  // Await params before destructuring as required by Next.js 15+
  const { account_id, product_id } = await params;
  
  try {
    const product = await productsTable.fetchById(account_id, product_id);
    if (!product) {
      return {
        title: 'Product Not Found',
        description: 'The requested product could not be found.'
      };
    }
    
    return {
      title: product.title,
      description: product.description || `Product: ${product.title}`
    };
  } catch (error) {
    console.error("Error fetching product metadata:", error);
    return {
      title: 'Error',
      description: 'An error occurred while fetching the product.'
    };
  }
} 