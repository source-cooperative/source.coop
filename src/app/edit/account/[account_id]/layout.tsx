import { ReactNode } from "react";
import {
  AccountSelector,
  SettingsLayout,
  SettingsHeader,
} from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import { isAuthorized } from "@/lib/api/authz";
import { Actions } from "@/types";
import { accountsTable } from "@/lib/clients/database";
import { notFound, redirect } from "next/navigation";
import { CONFIG } from "@/lib/config";
import {
  PersonIcon,
  LockClosedIcon,
  Pencil1Icon,
  GearIcon,
  ImageIcon,
} from "@radix-ui/react-icons";
import {
  editAccountProfileUrl,
  editAccountProfilePictureUrl,
  editAccountPermissionsUrl,
  editAccountMembershipsUrl,
  accountUrl,
} from "@/lib/urls";
import { ExternalLink } from "@/components";
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
  const manageableAccounts = await getManageableAccounts(userSession.account);

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
  const canEditAccount = isAuthorized(
    userSession,
    accountToEdit,
    Actions.PutAccountProfile
  );

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
            id: "permissions",
            label: "Permissions",
            href: editAccountPermissionsUrl(account_id),
            icon: <LockClosedIcon width="16" height="16" />,
            condition: isAuthorized(
              userSession,
              accountToEdit,
              Actions.GetAccount
            ),
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

        <ExternalLink href={accountUrl(accountToEdit.account_id)}>
          View Profile
        </ExternalLink>
      </SettingsHeader>

      <SettingsLayout menuItems={menuItems}>{children}</SettingsLayout>
    </>
  );
}
