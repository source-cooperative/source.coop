import useSWR from "swr";
import { useState, useEffect } from "react";
import {
  AccountProfileResponse,
  AccountFlags,
  UserSession,
  AccountType,
  MembershipState,
  MembershipRole,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import { SideNavLink } from "@/lib/types";
import { useRouter } from "next/router";

export function AccountSideNavLinks({ account_id }: { account_id: string }) {
  const router = useRouter();
  const currentPath = router.asPath;

  const { data: profile, isLoading: _profileIsLoading } = useSWR<
    AccountProfileResponse,
    ClientError
  >(account_id ? { path: `/api/v1/accounts/${account_id}/profile` } : null, {
    refreshInterval: 0,
  });

  const {
    data: accountFlags,
    mutate: _refreshAccountFlags,
    isLoading: _accountFlagsIsLoading,
    error: _accountFlagsError,
  } = useSWR<AccountFlags, ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/flags` } : null,
    {
      refreshInterval: 0,
    }
  );

  const {
    data: user,
    isLoading: _userIsLoading,
    error: _userError,
  } = useSWR<UserSession, ClientError>(
    account_id ? { path: `/api/v1/whoami` } : null,
    {
      refreshInterval: 0,
    }
  );

  var baseSideNavLinks: SideNavLink[] = [
    {
      href: `/${account_id}`,
      title: "Repositories",
      active: currentPath === `/${account_id}`,
    },
  ];

  const [sideNavLinks, setSideNavLinks] =
    useState<SideNavLink[]>(baseSideNavLinks);

  useEffect(() => {
    if (!account_id) {
      return;
    }

    if (!user) {
      return;
    }

    var newSideNav = [...baseSideNavLinks];

    var editPermissions = false;
    var adminPermissions = false;

    if (profile?.account_type === AccountType.ORGANIZATION) {
      newSideNav.push({
        href: `/${account_id}/sc.members`,
        title: "Members",
        active: currentPath === `/${account_id}/sc.members`,
      });
    }

    if (user?.account?.flags.includes(AccountFlags.ADMIN)) {
      editPermissions = true;
      adminPermissions = true;
    }

    if (user?.account?.account_id === account_id) {
      editPermissions = true;
    }

    for (const membership of user?.memberships) {
      if (
        membership.membership_account_id === account_id &&
        membership.state === MembershipState.Member &&
        (membership.role === MembershipRole.Owners ||
          membership.role === MembershipRole.Maintainers)
      ) {
        editPermissions = true;
      }
    }

    if (editPermissions) {
      newSideNav.push({
        href: `/${account_id}/sc.manage`,
        title: "Manage",
        active: currentPath === `/${account_id}/sc.manage`,
      });

      if (accountFlags?.includes(AccountFlags.CREATE_REPOSITORIES)) {
        newSideNav.push({
          href: `/${account_id}/sc.new-repository`,
          title: "New Repository",
          active: currentPath === `/${account_id}/sc.new-repository`,
        });
      }
    }

    if (user?.account?.account_id === account_id) {
      newSideNav.push({
        href: `/api/.ory/ui/settings`,
        title: "Security",
        active: false,
      });
    }

    setSideNavLinks(newSideNav);
  }, [account_id, user, profile, accountFlags]);

  return sideNavLinks;
}