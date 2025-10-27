import { FormTitle, AccountFlagsForm } from "@/components";
import { accountsTable, isOrganizationalAccount } from "@/lib/clients";
import { Box } from "@radix-ui/themes";
import { getPageSession } from "@/lib/api/utils";
import { NotAuthorizedPage } from "@/components/core";
import { notFound } from "next/navigation";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { editAccountProfileUrl } from "@/lib/urls";
import { redirect } from "next/navigation";

export async function generateMetadata({ params }: PageProps) {
  const { account_id } = await params;
  const account = await accountsTable.fetchById(account_id);
  return { title: `Edit ${account!.name} permissions` };
}
interface PageProps {
  params: Promise<{ account_id: string }>;
}

export default async function PermissionsPage({ params }: PageProps) {
  const { account_id } = await params;
  const session = await getPageSession();
  if (!session?.account) {
    return <NotAuthorizedPage />;
  }
  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }
  if (isOrganizationalAccount(account)) {
    redirect(editAccountProfileUrl(account_id));
  }
  if (!isAuthorized(session, account, Actions.GetAccountFlags)) {
    return <NotAuthorizedPage />;
  }
  return (
    <Box>
      <FormTitle
        title="Permissions"
        description="Manage this account's permissions and capabilities"
      />
      <AccountFlagsForm session={session} account={account} />
    </Box>
  );
}
