import { ReactNode } from "react";
import { SettingsLayout } from "./SettingsLayout";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, Account } from "@/types";
import { accountsTable, membershipsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";
import { MembershipRole, MembershipState } from "@/types";

interface AccountSettingsLayoutWrapperProps {
  children: ReactNode;
  accountId: string;
  requiredPermission: Actions;
  currentSettingType: string;
  additionalChecks?: (account: any) => boolean;
}

export async function AccountSettingsLayoutWrapper({
  children,
  accountId,
  requiredPermission,
  currentSettingType,
  additionalChecks,
}: AccountSettingsLayoutWrapperProps) {
  const session = await getPageSession();

  if (!session?.account) {
    redirect("/auth/login");
  }

  const account = await accountsTable.fetchById(accountId);
  if (!account) {
    notFound();
  }

  // Check if user is authorized for the required permission
  if (!isAuthorized(session, account, requiredPermission)) {
    notFound();
  }

  // Run any additional checks
  if (additionalChecks && !additionalChecks(account)) {
    notFound();
  }

  // Get manageable accounts for the dropdown
  const manageableAccounts = await getManageableAccounts(
    session.account.account_id
  );

  return (
    <SettingsLayout
      accountId={accountId}
      accountType={account.type}
      canReadAccount={isAuthorized(session, account, Actions.GetAccount)}
      canReadMembership={isAuthorized(session, account, Actions.GetMembership)}
      currentAccount={account}
      manageableAccounts={manageableAccounts}
      currentSettingType={currentSettingType}
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

  const manageableAccounts: Account[] = [userAccount];

  // Get organizations where user is owner or maintainer
  const memberships = await membershipsTable.listByUser(userAccountId);
  const organizationMemberships = memberships.filter(
    (membership) =>
      membership.state === MembershipState.Member &&
      (membership.role === MembershipRole.Owners ||
        membership.role === MembershipRole.Maintainers) &&
      membership.repository_id === undefined // Organization-level membership, not product-specific
  );

  // Fetch organization accounts
  const organizationAccountIds = organizationMemberships.map(
    (membership) => membership.membership_account_id
  );

  if (organizationAccountIds.length > 0) {
    const organizationAccounts = await accountsTable.fetchManyByIds(
      organizationAccountIds
    );
    manageableAccounts.push(...organizationAccounts);
  }

  return manageableAccounts;
}
