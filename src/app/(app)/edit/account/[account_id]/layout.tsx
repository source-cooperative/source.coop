import { ReactNode } from "react";
import {
  AccountSelector,
  SettingsLayout,
  SettingsHeader,
} from "@/components/features/settings";
import { getPageSession } from "@/lib/api/utils";
import {
  isAuthorized,
  canManageAccountDataConnections,
  canManageAccountServiceAccounts,
} from "@/lib/api/authz";
import { Actions } from "@/types";
import { accountsTable } from "@/lib/clients/database";
import { notFound } from "next/navigation";
import { LoginRequired } from "@/components/core";
import {
  PersonIcon,
  LockClosedIcon,
  Pencil1Icon,
  ImageIcon,
  Link1Icon,
  ExternalLinkIcon,
  CubeIcon,
} from "@radix-ui/react-icons";
import {
  editAccountProfileUrl,
  editAccountProfilePictureUrl,
  editAccountPermissionsUrl,
  editAccountMembershipsUrl,
  editAccountServiceAccountsUrl,
  accountDataConnectionsUrl,
  accountUrl,
  orySettingsUrl,
} from "@/lib/urls";
import { LinkAway } from "@/components/core/LinkAway";
import { getManageableAccounts } from "@/lib/clients/lookups";
import { getTranslations } from "next-intl/server";

interface AccountLayoutProps {
  children: ReactNode;
  params: Promise<{ account_id: string }>;
}

export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps) {
  const { account_id } = await params;
  const t = await getTranslations("EditAccountLayout");

  const userSession = await getPageSession();

  if (!userSession?.account) {
    return <LoginRequired />;
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
      label: t("details"),
      href: editAccountProfileUrl(account_id),
      icon: <Pencil1Icon width="16" height="16" />,
      condition: canReadAccount,
    },
    {
      id: "profile-picture",
      label: t("profilePicture"),
      href: editAccountProfilePictureUrl(account_id),
      icon: <ImageIcon width="16" height="16" />,
      condition: canEditAccount,
    },
    {
      id: "data-connections",
      label: t("dataConnections"),
      href: accountDataConnectionsUrl(account_id),
      icon: <Link1Icon width="16" height="16" />,
      condition: canManageDataConnections,
    },
    // Permissions (account flags) apply to both individuals and organizations;
    // view requires GetAccountFlags, edit is admin-only (enforced in the form).
    {
      id: "permissions",
      label: t("permissions"),
      href: editAccountPermissionsUrl(account_id),
      icon: <LockClosedIcon width="16" height="16" />,
      condition: isAuthorized(
        userSession,
        accountToEdit,
        Actions.GetAccountFlags,
      ),
    },
    // Individuals and organizations alike can own service accounts, once
    // granted the CREATE_SERVICE_ACCOUNTS flag.
    {
      id: "service-accounts",
      label: t("serviceAccounts"),
      href: editAccountServiceAccountsUrl(account_id),
      icon: <CubeIcon width="16" height="16" />,
      condition: canManageAccountServiceAccounts(userSession, accountToEdit),
    },
    ...(accountToEdit.type === "organization"
      ? [
          {
            id: "memberships",
            label: t("memberships"),
            href: editAccountMembershipsUrl(account_id),
            icon: <PersonIcon width="16" height="16" />,
            condition: canReadMembership,
          },
        ]
      : [
          {
            id: "authentication",
            label: t("authentication"),
            href: orySettingsUrl(),
            icon: <ExternalLinkIcon width="16" height="16" />,
            condition: canReadAccount,
            external: true,
            disabled: !isOwnAccount,
            disabledTooltip: t("authenticationDisabledTooltip"),
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
          {t("viewProfile")}
        </LinkAway>
      </SettingsHeader>

      <SettingsLayout menuItems={menuItems}>{children}</SettingsLayout>
    </>
  );
}
