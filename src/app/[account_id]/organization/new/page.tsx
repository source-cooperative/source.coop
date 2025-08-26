import { Container, Box, Heading, Text } from "@radix-ui/themes";
import { DynamicForm, FormField } from "@/components/core";
import { createAccount } from "@/lib/actions/account";
import { AccountType } from "@/types";

interface PageProps {
  params: Promise<{
    account_id: string;
  }>;
}

export default async function NewOrganizationPage({ params }: PageProps) {
  const { account_id } = await params;

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
      // TODO: We need a way to check if the account ID is available
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
            owner_account_id: account_id,
            type: AccountType.ORGANIZATION,
          }}
        />
      </Box>
    </Container>
  );
}
