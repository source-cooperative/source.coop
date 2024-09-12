import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { Heading, Divider, Grid } from "theme-ui";
import { RepositoryList } from "@/components/RepositoryList";

import { getProfile, getFlags } from "@/lib/client/accounts";
import { AccountObject } from "@/components/account/AccountObject";
import { listRepositoriesByAccount } from "@/lib/client/repositories";
import { SideNavLink } from "@/lib/types";
import { useUser } from "@/lib/api";
import { useEffect, useState } from "react";
import {
  AccountFlags,
  AccountType,
  MembershipRole,
  MembershipState,
  AccountProfileResponse,
  UserSession,
  RepositoryListResponse,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import useSWR from "swr";
import { AccountSideNavLinks } from "@/components/AccountSideNav";

export default function TenantDetails() {
  const router = useRouter();
  const { account_id } = router.query;
  const sideNavLinks = AccountSideNavLinks({
    account_id: account_id as string,
  });

  const {
    data: profile,
    mutate: refreshProfile,
    isLoading: _profileIsLoading,
    error: profileError,
  } = useSWR<AccountProfileResponse, ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/profile` } : null,
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
    mutate: _refreshUser,
    isLoading: _userIsLoading,
    error: _userError,
  } = useSWR<UserSession, ClientError>(
    account_id ? { path: `/api/v1/whoami` } : null,
    {
      refreshInterval: 0,
    }
  );

  const {
    data: repositories,
    mutate: _refreshRepositories,
    isLoading: _repositoriesIsLoading,
    error: _repositoriesError,
  } = useSWR<RepositoryListResponse, ClientError>(
    account_id
      ? {
          path: `/api/v1/repositories/${account_id}`,
          args: {
            page: 1,
            limit: 10,
            tags: undefined,
            q: undefined,
          },
        }
      : null,
    {
      refreshInterval: 0,
    }
  );

  return (
    <>
      <Layout
        notFound={profileError && profileError.status === 404}
        sideNavLinks={sideNavLinks}
      >
        <AccountObject account_id={account_id as string} />
        <Heading sx={{ mb: 2 }} as="h1">
          Repositories
        </Heading>
        <Divider />
        <Grid
          sx={{
            gridTemplateColumns: "1fr",
            justifyContent: "stretch",
            gridGap: 4,
          }}
        >
          {repositories ? (
            repositories.repositories.length > 0 ? (
              <RepositoryList
                repositoryResult={repositories}
                isLoading={false}
                isError={false}
              />
            ) : (
              <Heading as="h2">No Repositories Found</Heading>
            )
          ) : (
            <></>
          )}
        </Grid>
      </Layout>
    </>
  );
}
