"use client";

import { Account, AccountFlags, Actions, UserSession } from "@/types";
import { Text, Flex, Checkbox } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { DynamicForm } from "@/components/core";
import { updateAccountFlags } from "@/lib/actions/account";
import { isAuthorized } from "@/lib/api/authz";
import { useState, useEffect } from "react";

interface AccountFlagsFormProps {
  session: UserSession;
  account: Account;
}

// Dynamically create form data type from AccountFlags enum
type AccountFlagsFormData = {
  [K in AccountFlags]: boolean;
};

export function AccountFlagsForm({ session, account }: AccountFlagsFormProps) {
  // Create initial values for the form dynamically
  const initialValues = Object.fromEntries(
    Object.values(AccountFlags).map((flag) => [
      flag,
      account.flags?.includes(flag) || false,
    ])
  ) as AccountFlagsFormData;

  // To avoid a bug where the checkboxes are reverting to the initial values after form
  // submission, we track the current flag values for controlled checkboxes
  const [flagValues, setFlagValues] = useState(initialValues);
  useEffect(() => {
    setFlagValues(
      Object.fromEntries(
        Object.values(AccountFlags).map((flag) => [
          flag,
          flagValues[flag] || false,
        ])
      ) as AccountFlagsFormData
    );
  }, [account.flags, account.updated_at]);

  // Flag configurations with display names and descriptions
  const fields = [
    [
      AccountFlags.CREATE_REPOSITORIES,
      "Create Repositories",
      "Allows this account to create new repositories and manage repository settings.",
    ],
    [
      AccountFlags.CREATE_ORGANIZATIONS,
      "Create Organizations",
      "Allows this account to create new organizations and manage organizational accounts.",
    ],
    [
      AccountFlags.ADMIN,
      "Administrator",
      "Full administrative access to the platform. Can manage all accounts, repositories, and system settings.",
    ],
  ] as const;

  const disabled = !isAuthorized(session, account, Actions.PutAccountFlags);
  console.log({ disabled });

  return (
    <DynamicForm<AccountFlagsFormData>
      fields={fields.map(([name, displayName, description]) => ({
        name,
        description,
        type: "custom" as const,
        customComponent: (
          <Label.Root htmlFor={name}>
            <Flex align="center" gap="2">
              <Checkbox
                name={name}
                id={name}
                checked={flagValues[name]}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  setFlagValues((prev) => ({
                    ...prev,
                    [name]: checked === true,
                  }))
                }
              />
              <Text size="2">{displayName}</Text>
            </Flex>
          </Label.Root>
        ),
      }))}
      action={updateAccountFlags}
      disabled={disabled}
      submitButtonText="Update"
      initialValues={initialValues}
      hiddenFields={{ account_id: account.account_id }}
    />
  );
}
