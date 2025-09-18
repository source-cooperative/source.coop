import { Suspense } from "react";
import { Box, Text, Skeleton } from "@radix-ui/themes";
import { EditProfileForm } from "@/components/features/profiles/EditProfileForm";
import { accountsTable } from "@/lib/clients/database";

interface ProfilePageProps {
  params: Promise<{ account_id: string }>;
}

async function ProfilePageContent({ accountId }: { accountId: string }) {
  const account = await accountsTable.fetchById(accountId);

  return (
    <Box>
      <Text size="6" weight="bold" mb="2">
        Public Profile
      </Text>
      <Text size="3" color="gray" mb="6">
        Update your public profile information
      </Text>
      <EditProfileForm account={account} />
    </Box>
  );
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { account_id } = await params;

  return (
    <Suspense
      fallback={
        <Box>
          <Skeleton height="32px" width="200px" mb="2" />
          <Skeleton height="20px" width="300px" mb="6" />
          <Skeleton height="400px" width="100%" />
        </Box>
      }
    >
      <ProfilePageContent accountId={account_id} />
    </Suspense>
  );
}
