/**
 * Product Layout - Shared layout for product pages
 * 
 * This layout persists the ProductHeader across navigation within the product,
 * preventing unnecessary refetches when moving between paths.
 */

import { notFound } from 'next/navigation';
import { Container, Box } from '@radix-ui/themes';
import { productsTable } from "@/lib/clients/database";
import { ProductHeader } from '@/components/features/products';

interface ProductLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    account_id: string;
    product_id: string;
  }>;
}

export default async function ProductLayout({ children, params }: ProductLayoutProps) {
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
          {children}
        </Box>
      </Container>
    );
  } catch (error) {
    console.error('Error fetching product for layout:', error);
    return notFound();
  }
}
