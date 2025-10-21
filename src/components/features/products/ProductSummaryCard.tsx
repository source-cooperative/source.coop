import { Heading, Text, Box, Flex } from "@radix-ui/themes";
import { Actions, type Product } from "@/types";
import { TagList } from "./TagList";
import { isAuthorized } from "@/lib/api/authz";
import { getPageSession } from "@/lib/api/utils";
import { editProductUrl } from "@/lib/urls";
import { EditButton } from "@/components/core";

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
          {product.description}
        </Text>
      )}
      {product.metadata.tags && product.metadata.tags.length > 0 && (
        <TagList tags={product.metadata.tags} />
      )}
    </Box>
  );
}
