import useSWR from "swr";
import { useState, useEffect } from "react";
import {
  AccountFlags,
  UserSession,
  Repository,
  MembershipRole,
  MembershipState,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import { SideNavLink } from "@/lib/types";
import { useRouter } from "next/router";

export function RepositorySideNavLinks({
  account_id,
  repository_id,
}: {
  account_id: string;
  repository_id: string;
}) {
  const router = useRouter();
  const currentPath = router.asPath;

  const { data: repository, isLoading: _isRepositoryLoading } = useSWR<
    Repository,
    ClientError
  >(
    account_id && repository_id
      ? { path: `/api/v1/repositories/${account_id}/${repository_id}` }
      : null,
    {
      refreshInterval: 0,
    }
  );

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
      href: `/repositories/${account_id}/${repository_id}/description`,
      title: "Read Me",
      active:
        currentPath ===
        `/repositories/${account_id}/${repository_id}/description`,
    },
    {
      href: `/${account_id}/${repository_id}`,
      title: "Browse",
      active: currentPath.startsWith(`/${account_id}/${repository_id}`),
    },
    {
      href: `/repositories/${account_id}/${repository_id}/access`,
      title: "Access Data",
      active: currentPath.startsWith(
        `/repositories/${account_id}/${repository_id}/access`
      ),
    },
  ];

  const [sideNavLinks, setSideNavLinks] = useState<SideNavLink[]>([]);

  useEffect(() => {
    if (!account_id || !repository_id) {
      return;
    }

    if (!repository) {
      return;
    }

    var newSideNav = [...baseSideNavLinks];
    var editPermissions = false;

    if (user) {
      if (user && user?.account?.flags?.includes(AccountFlags.ADMIN)) {
        editPermissions = true;
      } else if (user && user?.account?.account_id === account_id) {
        editPermissions = true;
      } else {
        if (user) {
          for (const membership of user?.memberships) {
            if (
              membership.membership_account_id === account_id &&
              !membership.repository_id &&
              membership.state === MembershipState.Member &&
              (membership.role === MembershipRole.Owners ||
                membership.role === MembershipRole.Maintainers)
            ) {
              editPermissions = true;
              break;
            } else if (
              membership.membership_account_id === account_id &&
              membership.repository_id === repository_id &&
              membership.state === MembershipState.Member &&
              (membership.role === MembershipRole.Owners ||
                membership.role === MembershipRole.Maintainers)
            ) {
              editPermissions = true;
              break;
            }
          }
        }
      }
    }

    if (editPermissions) {
      newSideNav.push({
        href: `/repositories/${account_id}/${repository_id}/manage`,
        title: "Manage",
        active: currentPath.startsWith(
          `/repositories/${account_id}/${repository_id}/manage`
        ),
      });
      newSideNav.push({
        href: `/repositories/${account_id}/${repository_id}/members`,
        title: "Members",
        active: currentPath.startsWith(
          `/repositories/${account_id}/${repository_id}/members`
        ),
      });
    }

    setSideNavLinks(newSideNav);
  }, [account_id, user, account_id, repository_id, repository, accountFlags]);

  if (!repository_id || !account_id) {
    return [];
  }

  return sideNavLinks;
}
