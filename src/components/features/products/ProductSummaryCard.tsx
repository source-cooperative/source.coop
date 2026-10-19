"use server";

import { Heading, Text, Box, Flex } from "@radix-ui/themes";
import { Actions, type Product } from "@/types";
import { TagList } from "./TagList";
import { isAuthorized } from "@/lib/api/authz";
import { getPageSession } from "@/lib/api/utils";
import { hidePendingTags } from "@/lib/clients/database";
import { editProductUrl } from "@/lib/urls";
import { EditButton } from "@/components/core";
import { MarkdownViewer } from "../markdown";
import { ProductDoi } from "./ProductDoi";

interface ProductSummaryCardProps {
  product: Product;
}

export async function ProductSummaryCard({
  product: stored,
}: ProductSummaryCardProps) {
  const [session, [product]] = await Promise.all([
    getPageSession(),
    hidePendingTags([stored]),
  ]);
  return (
    <Box>
      <Flex align="center" justify="between" mb="2">
        <Heading size="8">{product.title}</Heading>
        {isAuthorized(session, product, Actions.PutRepository) && (
          <EditButton
            href={editProductUrl(product.account_id, product.product_id)}
          />
        )}
      </Flex>
      {product.description && (
        <Text color="gray" size="4" mb="4">
          <MarkdownViewer content={product.description} />
        </Text>
      )}
      {product.metadata.tags && product.metadata.tags.length > 0 && (
        <TagList tags={product.metadata.tags} />
      )}
      {product.metadata.doi && <ProductDoi doi={product.metadata.doi} />}
    </Box>
  );
}
