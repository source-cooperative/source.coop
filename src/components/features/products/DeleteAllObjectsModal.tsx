"use client";

import { Dialog } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useUploadManager } from "@/components/features/uploader/UploadProvider";
import { TypedConfirmDialog } from "@/components/core/TypedConfirmDialog";

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
  const { deletePath } = useUploadManager();
  const router = useRouter();

  // Not awaited, so the dialog closes at once; progress, and any failure, show
  // under Activity in the account menu, where a failed delete can be dismissed
  // and run again.
  const handleDelete = () => {
    deletePath("", true, { accountId, productId })
      .then(() => router.refresh())
      .catch((error) => console.error("Delete failed", error));
  };

  return (
    <TypedConfirmDialog
      label="Delete all objects"
      title="Delete all objects"
      expectedText={`${accountId}/${productId}`}
      onConfirm={handleDelete}
    >
      <Dialog.Description size="2">
        Every object stored in this product will be permanently deleted. The
        product, its page and its memberships stay. This cannot be undone.
      </Dialog.Description>
    </TypedConfirmDialog>
  );
}
