import { OrganizationCreationForm } from "@/components/features/organizations/OrganizationCreationForm";

interface PageProps {
  params: Promise<{
    account_id: string;
  }>;
}

export default async function NewOrganizationPage({ params }: PageProps) {
  const { account_id } = await params;

  return <OrganizationCreationForm ownerAccountId={account_id} />;
}
