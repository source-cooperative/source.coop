import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@radix-ui/themes";
import { EditProfileForm } from "@/components/features/profiles/EditProfileForm";
import { FormTitle } from "@/components/core/FormTitle";
import { accountsTable } from "@/lib/clients/database";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  return { title: `Edit ${account!.name} profile` };
}

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { account_id } = await params;

  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }
  return (
    <Box>
      <FormTitle
        title="Public Profile"
        description={
          account.type === "individual"
            ? "Update your public profile information"
            : "Update your organization's public profile information"
        }
      />
      <EditProfileForm account={account} />
    </Box>
  );
}
