import { ReactNode } from "react";
import { SettingsHeader, SettingsLayout } from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions, Account } from "@/types";
import { accountsTable, membershipsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";
import { MembershipRole, MembershipState } from "@/types";
import { CONFIG } from "@/lib/config";
import { PersonIcon, LockClosedIcon } from "@radix-ui/react-icons";

interface AccountLayoutProps {
  children: ReactNode;
  params: { account_id: string };
}

export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps) {
  const { account_id } = await params;

  const userSession = await getPageSession();

  if (!userSession?.account) {
    redirect(CONFIG.auth.routes.login);
  }

  const accountToEdit = await accountsTable.fetchById(account_id);
  if (!accountToEdit) {
    notFound();
  }

  // Check if user is authorized for account access
  // TODO: need permission for editing account
  if (!isAuthorized(userSession, accountToEdit, Actions.GetAccount)) {
    notFound();
  }

  // Get manageable accounts for the dropdown
  const memberships = await membershipsTable.listByUser(
    userSession.account.account_id
  );
  const manageableAccounts: Account[] = [
    userSession.account,
    ...(await accountsTable.fetchManyByIds(
      memberships
        // Filter for active memberships
        .filter(({ state }) => state === MembershipState.Member)
        // Filter for owner or maintainer roles
        .filter(({ role }) =>
          [MembershipRole.Owners, MembershipRole.Maintainers].includes(role)
        )
        // Filter for organization-level memberships (not product-specific)
        .filter(({ repository_id }) => repository_id === undefined)
        // Get the account IDs
        .map((membership) => membership.membership_account_id)
    )),
  ];

  const canReadAccount = isAuthorized(
    userSession,
    accountToEdit,
    Actions.GetAccount
  );
  const canReadMembership = isAuthorized(
    userSession,
    accountToEdit,
    Actions.ListAccountMemberships
  );

  const menuItems = [
    {
      id: "profile",
      label: "Public Profile",
      href: `/edit/account/${account_id}/profile`,
      icon: <PersonIcon width="16" height="16" />,
      condition: canReadAccount,
    },
    {
      id: "security",
      label: "Security",
      href: `/edit/account/${account_id}/security`,
      icon: <LockClosedIcon width="16" height="16" />,
      condition: canReadAccount,
    },
    ...(accountToEdit.type === "organization"
      ? [
          {
            id: "memberships",
            label: "Memberships",
            href: `/edit/account/${account_id}/memberships`,
            icon: <PersonIcon width="16" height="16" />,
            condition: canReadMembership,
          },
        ]
      : []),
  ];

  return (
    <>
      <SettingsHeader
        currentAccount={accountToEdit}
        manageableAccounts={manageableAccounts}
      />
      <SettingsLayout menuItems={menuItems}>{children}</SettingsLayout>
    </>
  );
}
