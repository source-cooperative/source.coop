import { notFound } from "next/navigation";
import { getServerSession } from "@ory/nextjs/app";
import { accountsTable } from "@/lib/clients/database";
import { getOryId } from "@/lib/ory";
import { NotAuthorizedPage, EditProfileForm, FormTitle } from "@/components";

type Params = Promise<{ account_id: string }>;

export default async function EditProfilePage({ params }: { params: Params }) {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  const session = await getServerSession();

  if (!account) {
    notFound();
  }

  // Can only edit your own profile
  if (session && account.identity_id !== getOryId(session)) {
    return (
      <NotAuthorizedPage description="You do not have permission to edit this profile." />
    );
  }

  return (
    <>
      <FormTitle
        title="Edit Profile"
        description="Edit your profile to update your publicly visible information"
      />
      <EditProfileForm account={account} />
    </>
  );
}
