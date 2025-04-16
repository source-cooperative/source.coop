import { DataList, Badge, Link as RadixLink } from '@radix-ui/themes';
import type { Product_v2 } from '@/types/product_v2';
import { MonoText } from '@/components/core';
import { formatBytes } from '@/lib/format';
import { DateText } from '@/components/display';
import Link from 'next/link';
import { Flex } from '@radix-ui/themes';
import { ProfileAvatar } from '@/components/features/profiles/ProfileAvatar';

interface ProductMetaContentProps {
  product: Product_v2;
}

export function ProductMetaContent({ product }: ProductMetaContentProps) {
  return (
    <DataList.Root>
      <DataList.Item>
        <DataList.Label>Visibility</DataList.Label>
        <DataList.Value>
          <Badge color={
            product.visibility === 'public' ? "green" : 
            product.visibility === 'unlisted' ? "yellow" : 
            "red"
          }>
            {product.visibility === 'public' ? "Public" : 
             product.visibility === 'unlisted' ? "Unlisted" : 
             "Restricted"}
          </Badge>
        </DataList.Value>
      </DataList.Item>
      
      <DataList.Item>
        <DataList.Label>Owner</DataList.Label>
        <DataList.Value>
          <Link href={`/${product.account_id}`} passHref legacyBehavior>
            <RadixLink>
              <Flex gap="2" align="center">
                {product.account && <ProfileAvatar account={product.account} size="2" />}
                <MonoText>{product.account?.name || product.account_id}</MonoText>
              </Flex>
            </RadixLink>
          </Link>
        </DataList.Value>
      </DataList.Item>
      
      <DataList.Item>
        <DataList.Label>Created</DataList.Label>
        <DataList.Value><DateText date={product.created_at} /></DataList.Value>
      </DataList.Item>
      
      <DataList.Item>
        <DataList.Label>Last Updated</DataList.Label>
        <DataList.Value><DateText date={product.updated_at} /></DataList.Value>
      </DataList.Item>
    </DataList.Root>
  );
} 