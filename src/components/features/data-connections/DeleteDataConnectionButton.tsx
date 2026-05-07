"use client";

import { useActionState } from "react";
import { Button, Text, Flex, AlertDialog } from "@radix-ui/themes";
import Form from "next/form";
import { deleteDataConnection } from "@/lib/actions/data-connections";

interface DeleteDataConnectionButtonProps {
  dataConnectionId: string;
}

export function DeleteDataConnectionButton({
  dataConnectionId,
}: DeleteDataConnectionButtonProps) {
  const [state, formAction, pending] = useActionState(deleteDataConnection, {
    message: "",
    data: new FormData(),
    fieldErrors: {},
    success: false,
  });

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
          cannot be undone. Products using this connection may be affected.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Form action={formAction}>
              <input
                type="hidden"
                name="data_connection_id"
                value={dataConnectionId}
              />
              <Button
                type="submit"
                color="red"
                disabled={pending}
                loading={pending}
              >
                Delete
              </Button>
            </Form>
          </AlertDialog.Action>
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
