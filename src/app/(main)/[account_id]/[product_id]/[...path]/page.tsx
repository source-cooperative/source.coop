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
import { fetchProduct } from '@/lib/db/operations_v2';
import { createStorageClient } from '@/lib/clients/storage';
import { ProductObject } from '@/types/product_object';

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
  const prefix = isFilePath ? pathString.slice(0, pathString.lastIndexOf('/') + 1) : 
                (pathString ? (pathString.endsWith('/') ? pathString : pathString + '/') : '');
  
  console.log('Debug - Page params:', { account_id, product_id, path, pathString, prefix, isFilePath });

  // 2. Find the product or 404
  const product = await fetchProduct(account_id, product_id);
  console.log('Debug - Product:', product);
  
  if (!product) {
    console.log('Debug - Product not found, returning 404');
    return notFound();
  }

  try {
    // 3. Get objects from storage
    console.log('Debug - Fetching objects with:', { account_id, product_id, object_path: pathString, prefix });
    const result = await createStorageClient().listObjects({
      account_id,
      product_id,
      object_path: pathString,
      prefix,
      delimiter: '/'
    });
    console.log('Debug - Storage result:', result);

    // 4. Transform storage objects to product objects
    const productObjects: ProductObject[] = (result?.objects || [])
      .filter(obj => obj?.path)
      .map(obj => ({
        id: obj.path!,
        product_id,
        path: obj.path!,
        size: obj.size || 0,
        type: obj.type || 'file',
        mime_type: obj.mime_type || '',
        created_at: obj.created_at || new Date().toISOString(),
        updated_at: obj.updated_at || new Date().toISOString(),
        checksum: obj.checksum || '',
        metadata: obj.metadata || {}
      }));
    console.log('Debug - Transformed objects:', productObjects);

    // 5. Find the selected object if we have a path
    const selectedObject = pathString ? productObjects.find(obj => obj.path === pathString) : undefined;
    console.log('Debug - Selected object:', selectedObject);

    // 6. Determine if we're viewing a file or directory
    const isFile = isFilePath || (selectedObject && selectedObject.type === 'file');
    const parentPath = isFile ? pathString.slice(0, pathString.lastIndexOf('/')) : pathString;
    console.log('Debug - Path info:', { isFile, parentPath, isFilePath });

    // 7. Render the page
    return (
      <Container>
        <ProductHeader product={product} />
        <Box mt="4">
          <ObjectBrowser
            product={product}
            objects={productObjects}
            initialPath={parentPath}
            selectedObject={selectedObject}
          />
        </Box>
      </Container>
    );
  } catch (error) {
    console.error('Debug - Error:', error);
    // Handle errors by showing an error message
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