"use client";

import { useState } from "react";
import { Text } from "@radix-ui/themes";
import { useTranslations } from "next-intl";
import { DynamicForm, FormField } from "@/components/core";
import { createAccount } from "@/lib/actions/account";
import { AccountType } from "@/types";
import { useAccountIdValidation } from "@/hooks/useIdValidation";

interface OrganizationCreationFormProps {
  ownerAccountId: string;
}

interface OrganizationFormData {
  name: string;
  account_id: string;
  description: string;
  website: string;
  email: string;
}

export function OrganizationCreationForm({
  ownerAccountId,
}: OrganizationCreationFormProps) {
  const t = useTranslations("OrganizationCreationForm");
  const [accountId, setAccountId] = useState("");
  const validationState = useAccountIdValidation(accountId);

  const fields: FormField<OrganizationFormData>[] = [
    {
      label: t("name"),
      name: "name",
      type: "text",
      required: true,
      description: t("nameDescription"),
      placeholder: t("namePlaceholder"),
    },
    {
      label: t("accountId"),
      name: "account_id",
      type: "text",
      required: true,
      description: t("accountIdDescription"),
      placeholder: t("accountIdPlaceholder"),
      controlled: true,
      value: accountId,
      onValueChange: setAccountId,
      isValid: !!validationState.isValid, // not checked (null) -> invalid
      message: validationState.isLoading ? (
        <Text size="1" color="gray">
          {t("checking")}
        </Text>
      ) : validationState.isValid === true ? (
        <Text size="1" color="green">
          {t("available")}
        </Text>
      ) : validationState.isValid === false && validationState.error ? (
        <Text size="1" color="red">
          {validationState.error}
        </Text>
      ) : null,
    },
    {
      label: t("description"),
      name: "description",
      type: "textarea",
      required: true,
      description: t("descriptionDescription"),
      placeholder: t("descriptionPlaceholder"),
    },
    {
      label: t("website"),
      name: "website",
      type: "url",
      description: t("websiteDescription"),
      placeholder: "https://example.com",
    },
    {
      label: t("email"),
      name: "email",
      type: "email",
      description: t("emailDescription"),
      placeholder: "contact@example.com",
    },
  ];

  return (
    <DynamicForm<OrganizationFormData>
      fields={fields}
      action={createAccount}
      submitButtonText={t("submit")}
      hiddenFields={{
        owner_account_id: ownerAccountId,
        type: AccountType.ORGANIZATION,
      }}
    />
  );
}
