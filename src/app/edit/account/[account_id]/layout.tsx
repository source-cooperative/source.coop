import { ReactNode } from "react";
import { SettingsLayout } from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, Account } from "@/types";
import { accountsTable, membershipsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";
import { MembershipRole, MembershipState } from "@/types";

interface AccountLayoutProps {
  children: ReactNode;
  params: { account_id: string };
}

export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps) {
  const { account_id } = await params;

  const session = await getPageSession();

  if (!session?.account) {
    redirect("/auth/login");
  }

  const account = await accountsTable.fetchById(account_id);
  if (!account) {
    notFound();
  }

  // Check if user is authorized for account access
  if (!isAuthorized(session, account, Actions.GetAccount)) {
    notFound();
  }

  // Get manageable accounts for the dropdown
  const manageableAccounts = await getManageableAccounts(
    session.account.account_id
  );

  return (
    <SettingsLayout
      accountId={account_id}
      accountType={account.type}
      canReadAccount={isAuthorized(session, account, Actions.GetAccount)}
      canReadMembership={isAuthorized(session, account, Actions.GetMembership)}
      currentAccount={account}
      manageableAccounts={manageableAccounts}
    >
      {children}
    </SettingsLayout>
  );
}

async function getManageableAccounts(
  userAccountId: string
): Promise<Account[]> {
  // Get user's own account
  const userAccount = await accountsTable.fetchById(userAccountId);
  if (!userAccount) {
    return [];
  }

  // TODO: Rework to use authz
  // Get organizations where user is owner or maintainer
  const memberships = await membershipsTable.listByUser(userAccountId);

  const manageableAccountIds = memberships
    // Filter for active memberships
    .filter(({ state }) => state === MembershipState.Member)
    // Filter for owner or maintainer roles
    .filter(({ role }) =>
      [MembershipRole.Owners, MembershipRole.Maintainers].includes(role)
    )
    // Filter for organization-level memberships (not product-specific)
    .filter(({ repository_id }) => repository_id === undefined)
    // Get the account IDs
    .map((membership) => membership.membership_account_id);

  return [
    userAccount,
    ...(await accountsTable.fetchManyByIds(manageableAccountIds)),
  ];
}
