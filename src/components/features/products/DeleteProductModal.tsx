"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  Button,
  TextField,
  Text,
  Flex,
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

      <Dialog.Content maxWidth="500px">
        <Dialog.Title>Delete Product</Dialog.Title>

        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            <Text weight="bold">This action is irreversible.</Text> All product
            data stored in the associated data connection will be permanently
            deleted, along with all memberships and the product record itself.
          </Callout.Text>
        </Callout.Root>

        <Text as="p" size="2" mb="3">
          To confirm, type{" "}
          <Text as="span" size="2" weight="bold" style={{ fontFamily: "monospace" }}>
            {expectedText}
          </Text>{" "}
          below:
        </Text>

        <TextField.Root
          placeholder={expectedText}
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={isPending}
          mb="4"
        />

        {error && (
          <Callout.Root color="red" mb="4">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <Separator size="4" mb="4" />

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
