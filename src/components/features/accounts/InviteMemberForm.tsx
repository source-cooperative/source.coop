"use client";

import { useState } from "react";
import { Account, MembershipRole, Product } from "@/types";
import { Flex, Button, Dialog } from "@radix-ui/themes";
import {
  AccountSearchInput,
  DynamicForm,
  FormField,
} from "@/components/core";
import { inviteMember } from "@/lib/actions/memberships";
import { PlusIcon } from "@radix-ui/react-icons";

interface InviteMemberFormProps {
  organization: Account;
  product?: Product;
}

interface InviteMemberFormData {
  account_id: string;
  role: MembershipRole;
  product_id?: string;
}

export function InviteMemberForm({
  organization,
  product,
}: InviteMemberFormProps) {
  const [open, setOpen] = useState(false);

  const fields: FormField<InviteMemberFormData>[] = [
    {
      label: "User",
      name: "account_id",
      type: "custom",
      required: true,
      description: "Search by username or name, or type an account ID",
      customComponent: (controlProps) => (
        <AccountSearchInput
          {...controlProps}
          name="account_id"
          required
          placeholder="username or name"
        />
      ),
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

        {/* Cancel goes through the form's own action row — as a sibling of the
            form it produced a second right-aligned row under the submit. */}
        <DynamicForm<InviteMemberFormData>
          fields={fields}
          action={inviteMember}
          submitButtonText="Send Invitation"
          initialValues={initialValues}
          hiddenFields={{
            organization_id: product
              ? product.account_id
              : organization.account_id,
            product_id: product?.product_id,
          }}
          onSuccess={() => setOpen(false)}
          secondaryAction={
            <Dialog.Close>
              <Button type="button" size="3" variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
          }
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
