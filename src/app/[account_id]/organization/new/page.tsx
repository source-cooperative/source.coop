import { Container, Box, Heading } from "@radix-ui/themes";
import { FormWrapper } from "@/components/core";
import { redirect } from "next/navigation";
import { CONFIG } from "@/lib/config";

interface PageProps {
  params: Promise<{
    account_id: string;
  }>;
}

export default async function NewOrganizationPage({ params }: PageProps) {
  const { account_id } = await params;

  async function handleSubmit(data: Record<string, string>) {
    "use server";

    try {
      // TODO: Replace with actual organization creation
      const response = await fetch(`${CONFIG.api.baseUrl}/api/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          type: "organization",
          owner_account_id: account_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create organization");
      }

      const newOrg = await response.json();
      redirect(`/${newOrg.account_id}/edit`);
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    }
  }

  const fields = [
    {
      label: "Organization Name",
      name: "name",
      type: "text" as const,
      required: true,
      description: "The name of your organization",
    },
    {
      label: "Description",
      name: "description",
      type: "textarea" as const,
      required: true,
      description: "A brief description of your organization",
    },
    {
      label: "Website",
      name: "website",
      type: "url" as const,
      description: "Your organization's website (optional)",
    },
    {
      label: "Email",
      name: "email",
      type: "email" as const,
      description: "Contact email for your organization (optional)",
    },
  ];

  return (
    <Container>
      <Box py="9">
        <Heading size="8" mb="6">
          Create New Organization
        </Heading>
        <FormWrapper
          fields={fields}
          onSubmit={handleSubmit}
          submitLabel="Create Organization"
          description="Create a new organization to collaborate with others"
        />
      </Box>
    </Container>
  );
}
