"use client";

import { useState } from "react";
import { Box, Text } from "@radix-ui/themes";
import { useTranslations } from "next-intl";
import { DynamicForm, FormField } from "@/components/core";
import { createAccount } from "@/lib/actions/account";
import { AccountType, Account } from "@/types";
import { useAccountIdValidation } from "@/hooks/useIdValidation";
import { EmailVerificationCallout } from "@/components/features/auth/EmailVerificationCallout";

type OnboardingFormData = Pick<Account, "account_id" | "name">;

export function OnboardingForm({ identityId }: { identityId: string }) {
  const t = useTranslations("OnboardingForm");
  const [accountId, setAccountId] = useState("");
  const validationState = useAccountIdValidation(accountId);

  const fields: FormField<OnboardingFormData>[] = [
    {
      label: t("username"),
      name: "account_id",
      type: "text",
      required: true,
      description: t("usernameDescription"),
      placeholder: t("usernamePlaceholder"),
      controlled: true,
      value: accountId,
      onValueChange: (value: string) => {
        const processedValue = value.toLowerCase().replace(/\s+/g, "");
        setAccountId(processedValue);
      },
      isValid: !!validationState.isValid,
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
      label: t("fullName"),
      name: "name",
      type: "text",
      required: true,
      description: t("fullNameDescription"),
      placeholder: t("fullNamePlaceholder"),
    },
  ];

  return (
    <Box pt="6">
      <EmailVerificationCallout status="unverified" />
      <DynamicForm<OnboardingFormData>
        fields={fields}
        action={createAccount}
        submitButtonText={t("submit")}
        hiddenFields={{
          type: AccountType.INDIVIDUAL,
          identity_id: identityId,
        }}
      />
    </Box>
  );
}
