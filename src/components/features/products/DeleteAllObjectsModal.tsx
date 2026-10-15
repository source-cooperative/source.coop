"use client";

import { useState } from "react";
import { Dialog, Button, TextField, Text, Flex, Box, Code } from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useUploadManager } from "@/components/features/uploader/UploadProvider";

interface DeleteAllObjectsModalProps {
  accountId: string;
  productId: string;
}

/**
 * Empties a product: deletes every object under it from the browser, through
 * the data proxy with the user's own credentials, as a background delete
 * tracked under Activity. The product itself stays.
 */
export function DeleteAllObjectsModal({
  accountId,
  productId,
}: DeleteAllObjectsModalProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { deletePath } = useUploadManager();
  const router = useRouter();

  const expectedText = `${accountId}/${productId}`;
  const isConfirmed = confirmText === expectedText;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setConfirmText("");
  };

  // The dialog closes at once; progress, and any failure, show under Activity
  // in the account menu, where a failed delete can be dismissed and run again.
  const handleDelete = () => {
    handleOpenChange(false);
    deletePath("", true, { accountId, productId })
      .then(() => router.refresh())
      .catch((error) => console.error("Delete failed", error));
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button color="red" variant="outline">
          <TrashIcon />
          Delete all objects
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="520px">
        <Dialog.Title>Delete all objects</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Every object stored in this product will be permanently deleted. The
          product, its page and its memberships stay. This cannot be undone.
        </Dialog.Description>

        <Box mb="4">
          <Text as="p" size="2" mb="2">
            To confirm, type <Code>{expectedText}</Code> below:
          </Text>
          <TextField.Root
            placeholder={expectedText}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </Box>

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button color="red" disabled={!isConfirmed} onClick={handleDelete}>
            <TrashIcon />
            Delete all objects
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
