"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  Button,
  TextField,
  Text,
  Flex,
  Box,
  Card,
  Code,
  Callout,
  Checkbox,
  Tooltip,
  Separator,
} from "@radix-ui/themes";
import { TrashIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { deleteProduct } from "@/lib/actions/products";
import { useRouter } from "next/navigation";
import { accountUrl } from "@/lib/urls";
import { useTranslations } from "next-intl";

interface DeleteProductModalProps {
  accountId: string;
  productId: string;
  /**
   * When true, offer the option to delete the product record while keeping the
   * underlying objects. Only allowed for non-system (account-owned) connections
   * or for admins; the server re-checks this regardless of what the UI sends.
   */
  canPreserveData?: boolean;
  /**
   * When true the connection is read-only, so Source never deletes its data:
   * the keep-data option is forced on and locked.
   */
  dataReadOnly?: boolean;
}

export function DeleteProductModal({
  accountId,
  productId,
  canPreserveData = false,
  dataReadOnly = false,
}: DeleteProductModalProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [preserveData, setPreserveData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations("DeleteProductModal");
  const tCommon = useTranslations("Common");

  const expectedText = `${accountId}/${productId}`;
  const isConfirmed = confirmText === expectedText;
  // Read-only connections force-keep their data; otherwise honor the checkbox.
  const keepData = dataReadOnly || preserveData;
  const showKeepOption = canPreserveData || dataReadOnly;

  const handleOpenChange = (next: boolean) => {
    if (!isPending) {
      setOpen(next);
      if (!next) {
        setConfirmText("");
        setPreserveData(false);
        setError(null);
      }
    }
  };

  const handleDelete = () => {
    if (!isConfirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(accountId, productId, keepData);
      if (result.success) {
        router.push(accountUrl(accountId));
      } else {
        setError(result.error ?? t("deleteFailed"));
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button color="red" variant="outline">
          <TrashIcon />
          {t("deleteProduct")}
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="520px">
        <Dialog.Title mb="4">{t("deleteProduct")}</Dialog.Title>

        <Flex direction="column" gap="4">
          {showKeepOption && (
            <Card asChild>
              <label>
                <Tooltip
                  content={t("readOnlyTooltip")}
                  // Only meaningful when the option is locked on.
                  open={dataReadOnly ? undefined : false}
                >
                  <Flex gap="3" align="start">
                    <Checkbox
                      mt="1"
                      checked={keepData}
                      onCheckedChange={(checked) =>
                        setPreserveData(checked === true)
                      }
                      disabled={isPending || dataReadOnly}
                    />
                    <Box>
                      <Text as="div" size="2" weight="medium">
                        {t("recordOnlyLabel")}
                      </Text>
                      <Text as="div" size="1" color="gray">
                        {dataReadOnly
                          ? t("recordOnlyReadOnly")
                          : t("recordOnlyDescription")}
                      </Text>
                    </Box>
                  </Flex>
                </Tooltip>
              </label>
            </Card>
          )}

          <Box>
            <Text as="p" size="2" mb="2">
              {t.rich("confirmPrompt", {
                expected: expectedText,
                code: (chunks) => <Code>{chunks}</Code>,
              })}
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
                {t("consequencesHeading")}
              </Text>
              <ul style={{ margin: 0, paddingInlineStart: "1.25rem" }}>
                <li>
                  <Text size="2">{t("consequenceRecord")}</Text>
                </li>
                <li>
                  <Text size="2">{t("consequenceMemberships")}</Text>
                </li>
                <li>
                  {keepData ? (
                    <Text size="2" color="gray">
                      {t("consequenceKeepData")}
                    </Text>
                  ) : (
                    <Text size="2" weight="medium">
                      {t("consequenceDeleteData")}
                    </Text>
                  )}
                </li>
              </ul>
              <Text as="p" size="2" weight="medium" color="red" mt="2">
                {t("cannotBeUndone")}
              </Text>
            </Box>
          </Flex>
        </Box>

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray" disabled={isPending}>
              {tCommon("cancel")}
            </Button>
          </Dialog.Close>
          <Button
            color="red"
            disabled={!isConfirmed || isPending}
            loading={isPending}
            onClick={handleDelete}
          >
            <TrashIcon />
            {t("deleteProduct")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
