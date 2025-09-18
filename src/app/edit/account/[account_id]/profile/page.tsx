import { Box } from "@radix-ui/themes";
import { FormTitle, EditProfileForm } from "@/components";
import { accountsTable, isIndividualAccount } from "@/lib/clients/database";
import { notFound } from "next/navigation";

interface ProfilePageProps {
  params: Promise<{ account_id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { account_id } = await params;

  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }
  return (
    <Box>
      <FormTitle
        title="Public Profile"
        description="Update your public profile information"
      />
      {isIndividualAccount(account) ? (
        <EditProfileForm account={account} />
      ) : (
        // TODO: Not sure if this view supports organizations
        <EditProfileForm account={account} />
      )}
    </Box>
  );
}
