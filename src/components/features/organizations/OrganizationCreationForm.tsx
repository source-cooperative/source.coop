"use client";

import { useState } from "react";
import { Container, Box, Heading, Text } from "@radix-ui/themes";
import { DynamicForm, FormField } from "@/components/core";
import { createAccount } from "@/lib/actions/account";
import { AccountType } from "@/types";
import { useAccountIdValidation } from "@/hooks/useAccountIdValidation";

interface OrganizationCreationFormProps {
  ownerAccountId: string;
}

export function OrganizationCreationForm({
  ownerAccountId,
}: OrganizationCreationFormProps) {
  const [accountId, setAccountId] = useState("");
  const validationState = useAccountIdValidation(accountId);

  const fields: FormField[] = [
    {
      label: "Organization Name",
      name: "name",
      type: "text",
      required: true,
      description: "The name of your organization",
      placeholder: "Enter organization name",
    },
    {
      label: "Account ID",
      name: "account_id",
      type: "text",
      required: true,
      description: "The account ID of your organization",
      placeholder: "Enter account ID",
      controlled: true,
      value: accountId,
      onValueChange: setAccountId,
      isValid: !!validationState.isValid, // not checked (null) -> invalid
      message: validationState.isLoading ? (
        <Text size="1" color="gray">
          Checking account ID availability...
        </Text>
      ) : validationState.isValid === true ? (
        <Text size="1" color="green">
          ✓ Available
        </Text>
      ) : validationState.isValid === false && validationState.error ? (
        <Text size="1" color="red">
          {validationState.error}
        </Text>
      ) : null,
    },
    {
      label: "Description",
      name: "description",
      type: "textarea",
      required: true,
      description: "A brief description of your organization",
      placeholder: "Describe your organization",
    },
    {
      label: "Website",
      name: "website",
      type: "url",
      description: "Your organization's website (optional)",
      placeholder: "https://example.com",
    },
    {
      label: "Email",
      name: "email",
      type: "email",
      description: "Contact email for your organization (optional)",
      placeholder: "contact@example.com",
    },
  ];

  return (
    <Container>
      <Box py="9">
        <Box mb="4">
          <Heading size="8" mb="1">
            Create New Organization
          </Heading>

          <Text size="2" color="gray">
            Create a new organization to collaborate with others
          </Text>
        </Box>

        <DynamicForm
          fields={fields}
          action={createAccount}
          submitButtonText="Create Organization"
          hiddenFields={{
            owner_account_id: ownerAccountId,
            type: AccountType.ORGANIZATION,
          }}
        />
      </Box>
    </Container>
  );
}
