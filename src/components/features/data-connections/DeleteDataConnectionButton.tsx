"use client";

import React, { useActionState } from "react";
import { Button, Text, Flex, AlertDialog } from "@radix-ui/themes";
import Form from "next/form";
import { useRouter } from "next/navigation";
import { deleteDataConnection } from "@/lib/actions/data-connections";

interface DeleteDataConnectionButtonProps {
  dataConnectionId: string;
}

export function DeleteDataConnectionButton({
  dataConnectionId,
}: DeleteDataConnectionButtonProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(deleteDataConnection, {
    message: "",
    data: new FormData(),
    fieldErrors: {},
    success: false,
  });

  // Navigate client-side back to the list once the deletion succeeds.
  React.useEffect(() => {
    if (state.success && state.redirectTo) {
      router.refresh();
      router.push(state.redirectTo);
    }
  }, [state.success, state.redirectTo, router]);

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button size="2" color="red" variant="soft">
          Delete
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>Delete Data Connection</AlertDialog.Title>
        <AlertDialog.Description>
          Are you sure you want to delete this data connection? This action
          cannot be undone.
        </AlertDialog.Description>
        <Text as="p" size="1" color="gray" mt="2">
          You cannot delete a connection while products are using it — remove it
          from all products first.
        </Text>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <Form action={formAction}>
            <input
              type="hidden"
              name="data_connection_id"
              value={dataConnectionId}
            />
            {/*
              Not wrapped in AlertDialog.Action: that closes the dialog on click,
              which would unmount this button mid-submission. We close on success
              by navigating away instead.
            */}
            <Button
              type="submit"
              color="red"
              disabled={pending}
              loading={pending}
            >
              Delete
            </Button>
          </Form>
        </Flex>
        {state.message && !state.success && (
          <Text size="1" color="red" mt="2">
            {state.message}
          </Text>
        )}
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
