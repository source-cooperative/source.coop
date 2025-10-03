"use client";

import { useState } from "react";
import { Account, MembershipRole } from "@/types";
import { Flex, Button, Dialog } from "@radix-ui/themes";
import { DynamicForm, FormField } from "@/components/core";
import { inviteMember } from "@/lib/actions/memberships";
import { PlusIcon } from "@radix-ui/react-icons";

interface InviteMemberFormProps {
  organization: Account;
}

interface InviteMemberFormData {
  account_id: string;
  role: MembershipRole;
}

export function InviteMemberForm({ organization }: InviteMemberFormProps) {
  const [open, setOpen] = useState(false);

  const fields: FormField<InviteMemberFormData>[] = [
    {
      label: "Account ID",
      name: "account_id",
      type: "text",
      required: true,
      placeholder: "user-account-id",
      description: "The account ID of the user to invite",
    },
    {
      label: "Role",
      name: "role",
      type: "select",
      required: true,
      placeholder: "Select a role",
      description: "The role to assign to the new member",
      options: [
        { value: MembershipRole.ReadData, label: "Reader" },
        { value: MembershipRole.WriteData, label: "Writer" },
        { value: MembershipRole.Maintainers, label: "Maintainer" },
        { value: MembershipRole.Owners, label: "Owner" },
      ],
    },
  ];

  const initialValues: InviteMemberFormData = {
    account_id: "",
    role: MembershipRole.ReadData,
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button size="2">
          <PlusIcon width="16" height="16" />
          Invite Member
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>Invite New Member</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Invite a user to join {organization.name} as a member.
        </Dialog.Description>

        <DynamicForm<InviteMemberFormData>
          fields={fields}
          action={inviteMember}
          submitButtonText="Send Invitation"
          initialValues={initialValues}
          hiddenFields={{
            organization_id: organization.account_id,
          }}
          onSuccess={() => setOpen(false)}
        />

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
