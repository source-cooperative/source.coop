// For search results with more metadata and highlighting
import { Card, Text, Flex, Badge } from '@radix-ui/themes';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import type { Product_v2 } from '@/types/product_v2';
import { DateText } from '@/components/display';

interface ProductSearchResultProps {
  product: Product_v2;
  highlight?: {
    title?: string;
    description?: string;
  };
}

export function ProductSearchResult({ product, highlight }: ProductSearchResultProps) {
  const sanitizedTitle = highlight?.title ? DOMPurify.sanitize(highlight.title) : product.title;
  const sanitizedDescription = highlight?.description ? 
    DOMPurify.sanitize(highlight.description) : 
    product.description;

  return (
    <Link href={`/${product.account_id}/${product.product_id}`}>
      <Card>
        <Flex direction="column" gap="2">
          <Text size="5" weight="bold" 
            dangerouslySetInnerHTML={{ __html: sanitizedTitle }} 
          />
          {(highlight?.description || product.description) && (
            <Text color="gray" 
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }} 
            />
          )}
          <Flex gap="3" align="center">
            <Text size="2" color="gray">
              Updated <DateText date={product.updated_at} />
            </Text>
            <Text size="2" color="blue">
              {product.account?.name}
            </Text>
            <Badge color={product.visibility === 'public' ? "green" : "red"}>
              {product.visibility === 'public' ? "Public" : "Private"}
            </Badge>
          </Flex>
        </Flex>
      </Card>
    </Link>
  );
} 