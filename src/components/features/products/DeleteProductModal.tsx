"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  Button,
  TextField,
  Text,
  Flex,
  Box,
  Code,
  Callout,
  Separator,
} from "@radix-ui/themes";
import { TrashIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { deleteProduct } from "@/lib/actions/products";
import { useRouter } from "next/navigation";
import { accountUrl } from "@/lib/urls";

interface DeleteProductModalProps {
  accountId: string;
  productId: string;
}

export function DeleteProductModal({
  accountId,
  productId,
}: DeleteProductModalProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const expectedText = `${accountId}/${productId}`;
  const isConfirmed = confirmText === expectedText;

  const handleOpenChange = (next: boolean) => {
    if (!isPending) {
      setOpen(next);
      if (!next) {
        setConfirmText("");
        setError(null);
      }
    }
  };

  const handleDelete = () => {
    if (!isConfirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(accountId, productId);
      if (result.success) {
        router.push(accountUrl(accountId));
      } else {
        setError(result.error ?? "Failed to delete product");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button color="red" variant="outline">
          <TrashIcon />
          Delete Product
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="520px">
        <Dialog.Title mb="4">Delete Product</Dialog.Title>

        <Flex direction="column" gap="4">
          <Box>
            <Text as="p" size="2" mb="2">
              To confirm, type <Code>{expectedText}</Code> below:
            </Text>
            <TextField.Root
              placeholder={expectedText}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isPending}
            />
          </Box>

          {error && (
            <Callout.Root color="red">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}
        </Flex>

        <Separator size="4" my="4" />

        <Box
          mb="4"
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
              <Text as="p" size="2" mt="2">
                A product that still holds objects can&apos;t be deleted:
                delete its objects first.
              </Text>
              <Text as="p" size="2" weight="medium" color="red" mt="2">
                This cannot be undone.
              </Text>
            </Box>
          </Flex>
        </Box>

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={isPending}>
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            color="red"
            disabled={!isConfirmed || isPending}
            loading={isPending}
            onClick={handleDelete}
          >
            <TrashIcon />
            Delete Product
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
