import { ReactNode } from "react";
import {
  AccountSelector,
  SettingsLayout,
  SettingsHeader,
} from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized, canManageAccountDataConnections } from "@/lib/api/authz";
import { Actions } from "@/types";
import { accountsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";
import { getReturnToUrl } from "@/lib/baseUrl";
import {
  PersonIcon,
  LockClosedIcon,
  Pencil1Icon,
  ImageIcon,
  Link1Icon,
  ExternalLinkIcon,
} from "@radix-ui/react-icons";
import {
  loginUrl,
  editAccountProfileUrl,
  editAccountProfilePictureUrl,
  editAccountPermissionsUrl,
  editAccountMembershipsUrl,
  accountDataConnectionsUrl,
  accountUrl,
  orySettingsUrl,
} from "@/lib/urls";
import { LinkAway } from "@/components/core/LinkAway";
import { getManageableAccounts } from "@/lib/clients/lookups";

interface AccountLayoutProps {
  children: ReactNode;
  params: Promise<{ account_id: string }>;
}

export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps) {
  const { account_id } = await params;

  const userSession = await getPageSession();

  if (!userSession?.account) {
    redirect(loginUrl(await getReturnToUrl()));
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
  const manageableAccounts = await getManageableAccounts(userSession.account);

  const canReadAccount = isAuthorized(
    userSession,
    accountToEdit,
    Actions.GetAccount,
  );
  const canReadMembership = isAuthorized(
    userSession,
    accountToEdit,
    Actions.ListAccountMemberships,
  );
  const canEditAccount = isAuthorized(
    userSession,
    accountToEdit,
    Actions.PutAccountProfile,
  );
  const canManageDataConnections = canManageAccountDataConnections(
    userSession,
    accountToEdit,
  );

  // Authentication details (email, password, keys) live in Ory and can only
  // be changed by the account owner themselves — not by an admin acting on
  // someone else's account.
  const isOwnAccount =
    userSession.account.account_id === accountToEdit.account_id;

  const menuItems = [
    {
      id: "profile",
      label: "Details",
      href: editAccountProfileUrl(account_id),
      icon: <Pencil1Icon width="16" height="16" />,
      condition: canReadAccount,
    },
    {
      id: "profile-picture",
      label: "Profile Picture",
      href: editAccountProfilePictureUrl(account_id),
      icon: <ImageIcon width="16" height="16" />,
      condition: canEditAccount,
    },
    {
      id: "data-connections",
      label: "Data Connections",
      href: accountDataConnectionsUrl(account_id),
      icon: <Link1Icon width="16" height="16" />,
      condition: canManageDataConnections,
    },
    // Permissions (account flags) apply to both individuals and organizations;
    // view requires GetAccountFlags, edit is admin-only (enforced in the form).
    {
      id: "permissions",
      label: "Permissions",
      href: editAccountPermissionsUrl(account_id),
      icon: <LockClosedIcon width="16" height="16" />,
      condition: isAuthorized(
        userSession,
        accountToEdit,
        Actions.GetAccountFlags,
      ),
    },
    ...(accountToEdit.type === "organization"
      ? [
          {
            id: "memberships",
            label: "Memberships",
            href: editAccountMembershipsUrl(account_id),
            icon: <PersonIcon width="16" height="16" />,
            condition: canReadMembership,
          },
        ]
      : [
          {
            id: "authentication",
            label: "Authentication",
            href: orySettingsUrl(),
            icon: <ExternalLinkIcon width="16" height="16" />,
            condition: canReadAccount,
            external: true,
            disabled: !isOwnAccount,
            disabledTooltip:
              "Admins can't edit another user's authentication details.",
          },
        ]),
  ];

  return (
    <>
      <SettingsHeader>
        <AccountSelector
          currentAccount={accountToEdit}
          manageableAccounts={manageableAccounts}
          linkToSameView
        />

        <LinkAway href={accountUrl(accountToEdit.account_id)}>
          View Profile
        </LinkAway>
      </SettingsHeader>

      <SettingsLayout menuItems={menuItems}>{children}</SettingsLayout>
    </>
  );
}
