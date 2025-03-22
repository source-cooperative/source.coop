'use client';

import { Dialog } from '@radix-ui/themes';

interface WelcomeDialogProps {
  show: boolean;
}

export function WelcomeDialog({ show }: WelcomeDialogProps) {
  if (!show) return null;

  return (
    <Dialog.Root open={true}>
      <Dialog.Content>
        <Dialog.Title>Welcome to Source!</Dialog.Title>
        <Dialog.Description>
          Please check your email to verify your account.
        </Dialog.Description>
      </Dialog.Content>
    </Dialog.Root>
  );
} 