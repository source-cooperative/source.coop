import { OrganizationCreationForm } from "@/components/features/organizations/OrganizationCreationForm";
import { NotFoundPage } from "@/components/core";
import { getPageSession } from "@/lib/api/utils";
import { redirect } from "next/navigation";

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
      <NotFoundPage
        title="Login Required"
        description="You must be logged in to create an organization."
        actionText="Go to Login"
        actionHref="/auth/login"
      />
    );
  }

  if (session.account.account_id !== account_id) {
    redirect(`/${session.account.account_id}/organization/new`);
  }

  return (
    <OrganizationCreationForm ownerAccountId={session.account.account_id} />
  );
}
