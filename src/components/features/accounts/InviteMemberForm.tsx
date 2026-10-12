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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("InviteMemberForm");
  const tCommon = useTranslations("Common");
  const [open, setOpen] = useState(false);

  const fields: FormField<InviteMemberFormData>[] = [
    {
      label: t("account"),
      name: "account_id",
      type: "custom",
      required: true,
      description: t("accountDescription"),
      customComponent: (controlProps) => (
        <AccountSearchInput
          {...controlProps}
          name="account_id"
          required
          placeholder={t("accountPlaceholder")}
          memberOf={organization.account_id}
        />
      ),
    },
    {
      label: t("role"),
      name: "role",
      type: "select",
      required: true,
      placeholder: t("rolePlaceholder"),
      description: t("roleDescription"),
      options: [
        { value: MembershipRole.ReadData, label: t("roleReader") },
        { value: MembershipRole.WriteData, label: t("roleWriter") },
        { value: MembershipRole.Maintainers, label: t("roleMaintainer") },
        { value: MembershipRole.Owners, label: t("roleOwner") },
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
        <Button size="2" highContrast>
          <PlusIcon width="16" height="16" />
          {t("invite")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 450 }}>
        <Dialog.Title>{t("title")}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {t("description", { name: organization.name })}
        </Dialog.Description>

        {/* Cancel goes through the form's own action row — as a sibling of the
            form it produced a second right-aligned row under the submit. */}
        <DynamicForm<InviteMemberFormData>
          fields={fields}
          action={inviteMember}
          submitButtonText={t("submit")}
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
                {tCommon("cancel")}
              </Button>
            </Dialog.Close>
          }
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
