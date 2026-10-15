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
} from "@radix-ui/themes";
import { TrashIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface TypedConfirmDialogProps {
  /** On the trigger and on the confirm button. */
  label: string;
  title: string;
  /** What the action does, above the confirmation. */
  children: React.ReactNode;
  /** The text to type before the action unlocks. */
  expectedText: string;
  /**
   * Runs the action. Resolving closes the dialog; resolving to a message keeps
   * it open and shows the message, so the user can read it and try again.
   */
  onConfirm: () => Promise<string | void> | string | void;
}

/** A destructive action behind a dialog that unlocks only once the user types `expectedText`. */
export function TypedConfirmDialog({
  label,
  title,
  children,
  expectedText,
  onConfirm,
}: TypedConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isConfirmed = confirmText === expectedText;

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    setOpen(next);
    if (!next) {
      setConfirmText("");
      setError(null);
    }
  };

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const message = await onConfirm();
      if (message) setError(message);
      else {
        setOpen(false);
        setConfirmText("");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button color="red" variant="outline">
          <TrashIcon />
          {label}
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="520px">
        <Dialog.Title>{title}</Dialog.Title>
        <Box mb="4">{children}</Box>

        <Flex direction="column" gap="4" mb="4">
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
            onClick={handleConfirm}
          >
            <TrashIcon />
            {label}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
