import { Box, Text } from "@radix-ui/themes";
import { EditProfileForm } from "@/components/features/profiles/EditProfileForm";
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
      <Text size="6" weight="bold" mb="2">
        Public Profile
      </Text>
      <Text size="3" color="gray" mb="6">
        Update your public profile information
      </Text>
      {isIndividualAccount(account) ? (
        <EditProfileForm account={account} />
      ) : (
        // TODO: Not sure if this view supports organizations
        <EditProfileForm account={account} />
      )}
    </Box>
  );
}
