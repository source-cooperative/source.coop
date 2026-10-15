"use client";

import { Text, Flex, Box } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { deleteProduct } from "@/lib/actions/products";
import { useRouter } from "next/navigation";
import { accountUrl } from "@/lib/urls";
import { TypedConfirmDialog } from "@/components/core/TypedConfirmDialog";

interface DeleteProductModalProps {
  accountId: string;
  productId: string;
}

export function DeleteProductModal({
  accountId,
  productId,
}: DeleteProductModalProps) {
  const router = useRouter();

  const handleDelete = async () => {
    const result = await deleteProduct(accountId, productId);
    if (!result.success) return result.error ?? "Failed to delete product";
    router.push(accountUrl(accountId));
  };

  return (
    <TypedConfirmDialog
      label="Delete Product"
      title="Delete Product"
      expectedText={`${accountId}/${productId}`}
      onConfirm={handleDelete}
    >
      <Box
        mt="4"
        p="3"
        style={{
          backgroundColor: "var(--red-2)",
          border: "1px solid var(--red-6)",
          borderRadius: "var(--radius-3)",
        }}
      >
        <Flex gap="2" align="start">
          <Text color="red" mt="1" style={{ lineHeight: 0 }}>
            <ExclamationTriangleIcon />
          </Text>
          <Box>
            <Text as="p" size="2" weight="bold" color="red" mb="2">
              Deleting this product will:
            </Text>
            <ul style={{ margin: 0, paddingInlineStart: "1.25rem" }}>
              <li>
                <Text size="2">Remove the product record and its page</Text>
              </li>
              <li>
                <Text size="2">Remove all of its memberships</Text>
              </li>
            </ul>
            <Text as="p" size="2" weight="medium" color="red" mt="2">
              This cannot be undone.
            </Text>
          </Box>
        </Flex>
      </Box>
    </TypedConfirmDialog>
  );
}
