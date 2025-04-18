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
import { fetchProduct } from '@/lib/db/operations_v2';
import { ProductHeader } from '@/components/features/products';
import { ObjectBrowser } from '@/components/features/products';
import { createStorageClient } from '@/lib/clients/storage';
import type { ProductObject } from '@/types/product_object';
import { MarkdownViewer } from '@/components/features/markdown/MarkdownViewer';

interface ProductPageProps {
  params: Promise<{
    account_id: string;
    product_id: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  // Await params before destructuring as required by Next.js 15+
  const { account_id, product_id } = await Promise.resolve(params);
  
  try {
    const product = await fetchProduct(account_id, product_id);
    if (!product) {
      return notFound();
    }

    // Get objects from storage
    const result = await createStorageClient().listObjects({
      account_id,
      product_id, // Use product_id instead of repository_id
      object_path: '',
      prefix: ''
    });

    // Transform storage objects to product objects
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

    // Check for README.md file
    const readmeFile = productObjects.find(obj => 
      obj.path.toLowerCase() === 'readme.md' || 
      obj.path.toLowerCase() === 'readme'
    );

    let readmeContent = '';
    
    // If README.md exists, fetch its content
    if (readmeFile) {
      try {
        const storageClient = createStorageClient();
        const readmeResult = await storageClient.getObject({
          account_id,
          product_id, // Use product_id instead of repository_id
          object_path: readmeFile.path
        });
        
        // Convert buffer to string
        readmeContent = readmeResult.data.toString('utf-8');
      } catch (error) {
        console.error('Error fetching README content:', error);
        // Continue without README if there's an error
      }
    }

    return (
      <Container>
        <ProductHeader product={product} />
        
        <Box mt="4">
          <ObjectBrowser
            product={product}
            objects={productObjects}
            initialPath=""
          />
        </Box>

        {/* Display README if available */}
        {readmeContent && (
          <Box mt="4">
            <MarkdownViewer content={readmeContent} />
          </Box>
        )}
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
  const { account_id, product_id } = await Promise.resolve(params);
  
  try {
    const product = await fetchProduct(account_id, product_id);
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
    return {
      title: 'Error',
      description: 'An error occurred while fetching the product.'
    };
  }
} 