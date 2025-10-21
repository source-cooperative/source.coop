import { Box } from "@radix-ui/themes";
import { FormTitle, EditProfileForm } from "@/components";
import { accountsTable, isIndividualAccount } from "@/lib/clients/database";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: PageProps) {
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
