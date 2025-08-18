/**
 * Product Path Page - Displays product contents at a specific path
 * 
 * KEEP IT SIMPLE:
 * 1. URL params are known values (/[account_id]/[product_id]/[...path])
 * 2. Get data -> Transform if needed -> Render
 * 3. Trust your types, avoid complex validation
 * 4. Let Next.js handle errors (404, 500, etc.)
 * 5. No helper functions unless truly needed
 */

// External packages
import { Container, Box, Text } from '@radix-ui/themes';
import { notFound } from 'next/navigation';

// Internal components
import { ObjectBrowser, ProductHeader } from '@/components/features/products';

// Utilities
import { productsTable } from "@/lib/clients/database";
import { createStorageClient } from '@/lib/clients/storage';
import type { ProductObject } from '@/types/product_object';

interface PageProps {
  params: Promise<{
    account_id: string;
    product_id: string;
    path?: string[];
  }>;
}

export default async function ProductPathPage({
  params
}: PageProps) {
  // 1. Get and await params
  const { account_id, product_id, path } = await params;
  const pathString = decodeURIComponent(path?.join('/') || '');
  
  // Check if this is a file path (ends with a file extension)
  const isFilePath = pathString && /\.\w+$/.test(pathString);
  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    return notFound();
  }

  try {
    let selectedObject: ProductObject | undefined;
    if (isFilePath) {
      try {
        selectedObject = await createStorageClient().getObjectInfo({
          account_id,
          product_id,
          object_path: pathString,
        });
      } catch {
        // Ignore if object info cannot be fetched
      }
    }

    const parentPath = isFilePath
      ? pathString.slice(0, pathString.lastIndexOf('/'))
      : pathString;

    return (
      <Container>
        <ProductHeader product={product} />
        <Box mt="4">
          <ObjectBrowser
            product={product}
            initialPath={parentPath}
            selectedObject={selectedObject}
          />
        </Box>
      </Container>
    );
  } catch (error) {
    console.error('Error loading product path:', error);
    return (
      <Container>
        <ProductHeader product={product} />
        <Box mt="4">
          <Text role="alert" color="red" size="3">
            {error instanceof Error ? error.message : 'An error occurred while loading product contents'}
          </Text>
        </Box>
      </Container>
    );
  }
}