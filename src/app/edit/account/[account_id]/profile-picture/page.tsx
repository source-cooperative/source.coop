import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Box } from "@radix-ui/themes";
import { FormTitle } from "@/components";
import { ProfileImageUpload } from "@/components/features/profiles/ProfileImageUpload";
import { accountsTable } from "@/lib/clients/database";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  return { title: `${account!.name} settings` };
}

interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function ProfilePicturePage({ params }: PageProps) {
  const { account_id } = await params;

  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }

  return (
    <Box>
      <FormTitle
        title="Profile Picture"
        description={`Manage your ${
          account.type === "individual" ? "account" : "organization"
        }'s profile picture`}
      />
      <ProfileImageUpload account={account} />
    </Box>
  );
}
