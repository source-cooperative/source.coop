"use server";

import { Heading, Text, Box, Flex, Code } from "@radix-ui/themes";
import { Actions, type Product } from "@/types";
import { TagList } from "./TagList";
import { isAuthorized } from "@/lib/api/authz";
import { getPageSession } from "@/lib/api/utils";
import { editProductUrl } from "@/lib/urls";
import { EditButton, MonoText } from "@/components/core";
import { MarkdownViewer } from "../markdown";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";

interface ProductSummaryCardProps {
  product: Product;
}

export async function ProductSummaryCard({ product }: ProductSummaryCardProps) {
  const session = await getPageSession();
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
      {product.metadata.doi && (
        <Text size="2" color="gray">
          <Flex align="center" gap="2" my="4">
            <strong>DOI:</strong> <Code>{product.metadata.doi}</Code>
            <CopyToClipboard text={product.metadata.doi} />
          </Flex>
        </Text>
      )}
    </Box>
  );
}
