import { Heading, Text, Box, Flex, Button } from "@radix-ui/themes";
import { Actions, type Product } from "@/types";
import { TagList } from "./TagList";
import Link from "next/link";
import { isAuthorized } from "@/lib/api/authz";
import { getPageSession } from "@/lib/api/utils";
import { editProductUrl } from "@/lib/urls";

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
          <Link href={editProductUrl(product.account_id, product.product_id)}>
            <Button>Edit</Button>
          </Link>
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
