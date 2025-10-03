// import { useState } from "react";
import { Account, AccountFlags, Actions } from "@/types";
import { Box, Text, Flex, Checkbox, Card } from "@radix-ui/themes";
import { DynamicForm, FormField } from "@/components/core";
import { updateAccountFlags } from "@/lib/actions/account";
import { isAuthorized } from "@/lib/api/authz";
import { getPageSession } from "@/lib/api/utils";

interface AccountFlagsFormProps {
  account: Account;
}

interface AccountFlagsFormData {
  flags: AccountFlags[];
}

export async function AccountFlagsForm({
  account: initialAccount,
}: AccountFlagsFormProps) {
  const session = await getPageSession();
  // const [selectedFlags, setSelectedFlags] = useState<AccountFlags[]>(
  //   initialAccount.flags || []
  // );

  // const handleFlagChange = (flag: AccountFlags, checked: boolean) => {
  //   if (checked) {
  //     setSelectedFlags((prev) => [...prev, flag]);
  //   } else {
  //     setSelectedFlags((prev) => prev.filter((f) => f !== flag));
  //   }
  // };

  // Create initial values for the form
  const initialValues: AccountFlagsFormData = {
    flags: initialAccount.flags || [],
  };

  return (
    <DynamicForm<AccountFlagsFormData>
      fields={[
        {
          label: "Account Flags",
          name: "flags",
          type: "custom",
          description:
            "Select the permissions and capabilities for this account",
          customComponent: (
            <Flex direction="column" gap="3">
              {Object.values(AccountFlags).map((flag) => (
                <Card key={flag} variant="surface" size="2">
                  <Flex align="center" gap="3">
                    <Checkbox
                      checked={initialValues.flags.includes(flag)}
                      // onCheckedChange={(checked) =>
                      //   // handleFlagChange(flag, checked as boolean)
                      //   console.log(flag, checked)
                      // }
                      id={`flag-${flag}`}
                    />
                    <Flex direction="column" gap="1">
                      <Text
                        size="2"
                        weight="medium"
                        as="label"
                        htmlFor={`flag-${flag}`}
                      >
                        {getFlagDisplayName(flag)}
                      </Text>
                      <Text size="1" color="gray" mt="1">
                        {getFlagDescription(flag)}
                      </Text>
                    </Flex>
                  </Flex>
                </Card>
              ))}
            </Flex>
          ),
        },
      ]}
      action={updateAccountFlags}
      disabled={!isAuthorized(session, initialAccount, Actions.PutAccountFlags)}
      submitButtonText="Update Flags"
      initialValues={initialValues}
      hiddenFields={{
        account_id: initialAccount.account_id,
        // Add selected flags as hidden fields
        ...initialValues.flags.reduce((acc, flag) => {
          acc[`flag_${flag}`] = "on";
          return acc;
        }, {} as Record<string, string>),
      }}
    />
  );
}

function getFlagDisplayName(flag: AccountFlags): string {
  switch (flag) {
    case AccountFlags.ADMIN:
      return "Administrator";
    case AccountFlags.CREATE_REPOSITORIES:
      return "Create Repositories";
    case AccountFlags.CREATE_ORGANIZATIONS:
      return "Create Organizations";
    default:
      return flag;
  }
}

function getFlagDescription(flag: AccountFlags): string {
  switch (flag) {
    case AccountFlags.ADMIN:
      return "Full administrative access to the platform. Can manage all accounts, repositories, and system settings.";
    case AccountFlags.CREATE_REPOSITORIES:
      return "Allows this account to create new repositories and manage repository settings.";
    case AccountFlags.CREATE_ORGANIZATIONS:
      return "Allows this account to create new organizations and manage organizational accounts.";
    default:
      return "";
  }
}
