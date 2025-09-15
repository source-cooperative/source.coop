import { OrganizationCreationForm } from "@/components/features/organizations/OrganizationCreationForm";
import { FormTitle } from "@/components/core";
import { getPageSession } from "@/lib/api/utils";
import { redirect } from "next/navigation";
import { Container, Heading, Text } from "@radix-ui/themes";

interface PageProps {
  params: Promise<{
    account_id: string;
  }>;
}

export default async function NewOrganizationPage({ params }: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();

  if (!session?.account) {
    return (
      <Container size="2" py="6">
        <Heading size="6" mb="4">
          Access Denied
        </Heading>

        <Text as="p" size="3" color="gray" className="mb-4">
          You must be logged in to create an organization.
        </Text>
      </Container>
    );
  }

  if (session.account.account_id !== account_id) {
    redirect(`/${session.account.account_id}/organization/new`);
  }

  return (
    <>
      <FormTitle
        title="Create New Organization"
        description="Create a new organization to collaborate with others"
      />
      <OrganizationCreationForm ownerAccountId={session.account.account_id} />
    </>
  );
}
