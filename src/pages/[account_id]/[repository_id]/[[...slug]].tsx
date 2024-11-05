import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import RepositoryBrowser from "@/components/repository/RepositoryBrowser";
import { RepositoryListing } from "@/components/repository/RepositoryListing";
import { Grid } from "theme-ui";
import { RepositorySideNavLinks } from "@/components/RepositorySideNav";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { Repository } from "@/api/types";
import { ClientError } from "@/lib/client/accounts";

export default function RepositoryDetail() {
  const router = useRouter();

  const { account_id, repository_id } = router.query;
  const [accountId, setAccountId] = useState<string>(account_id as string);
  const [repositoryId, setRepositoryId] = useState<string>(
    repository_id as string
  );

  useEffect(() => {
    setAccountId(account_id as string);
    setRepositoryId(repository_id as string);
  }, [account_id, repository_id]);

  const { data: repository, error: repositoryError } = useSWR<
    Repository,
    ClientError
  >(
    accountId && repositoryId
      ? { path: `/api/v1/repositories/${account_id}/${repository_id}` }
      : null,
    {
      refreshInterval: 0,
    }
  );

  const sideNavLinks = RepositorySideNavLinks({
    account_id: accountId,
    repository_id: repositoryId,
  });

  if (!accountId || !repositoryId) return <div>Loading...</div>;

  return (
    <Layout
      notFound={repositoryError && repositoryError.status === 404}
      sideNavLinks={sideNavLinks}
    >
      <Grid sx={{ gap: 4 }}>
        <RepositoryListing repository={repository} truncate={false} />
        <RepositoryBrowser
          account_id={accountId}
          repository_id={repositoryId}
        />
      </Grid>
    </Layout>
  );
}
