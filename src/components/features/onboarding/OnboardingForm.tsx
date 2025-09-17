"use client";

import { useState } from "react";
import { Box, Text } from "@radix-ui/themes";
import { DynamicForm, FormField } from "@/components/core";
import { createAccount } from "@/lib/actions/account";
import { AccountType, Account } from "@/types";
import { useAccountIdValidation } from "@/hooks/useIdValidation";
import { EmailVerificationCallout } from "@/components/features/auth/EmailVerificationCallout";

type OnboardingFormData = Pick<Account, "account_id" | "name">;

export function OnboardingForm({ identityId }: { identityId: string }) {
  const [accountId, setAccountId] = useState("");
  const validationState = useAccountIdValidation(accountId);

  const fields: FormField<OnboardingFormData>[] = [
    {
      label: "Username",
      name: "account_id",
      type: "text",
      required: true,
      description: "This will be your profile URL: source.coop/[username]",
      placeholder: "Choose a username",
      controlled: true,
      value: accountId,
      onValueChange: (value: string) => {
        const processedValue = value.toLowerCase().replace(/\s+/g, "");
        setAccountId(processedValue);
      },
      isValid: !!validationState.isValid,
      message: validationState.isLoading ? (
        <Text size="1" color="gray">
          Checking username availability...
        </Text>
      ) : validationState.isValid === true ? (
        <Text size="1" color="green">
          ✓ Username is available
        </Text>
      ) : validationState.isValid === false && validationState.error ? (
        <Text size="1" color="red">
          {validationState.error}
        </Text>
      ) : null,
    },
    {
      label: "Full Name",
      name: "name",
      type: "text",
      required: true,
      description: "This is the name that will be displayed on your profile",
      placeholder: "Your Name",
    },
  ];

  return (
    <Box pt="6">
      <EmailVerificationCallout showCheckEmail={true} />
      <DynamicForm<OnboardingFormData>
        fields={fields}
        action={createAccount}
        submitButtonText="Complete Profile"
        hiddenFields={{
          type: AccountType.INDIVIDUAL,
          identity_id: identityId,
        }}
      />
    </Box>
  );
}
