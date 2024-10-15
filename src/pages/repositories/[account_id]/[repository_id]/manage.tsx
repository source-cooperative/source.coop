import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { RepositoryListing } from "@/components/repository/RepositoryListing";
import { RepositorySideNavLinks } from "@/components/RepositorySideNav";
import { EditRepositoryForm } from "@/components/repository/EditRepositoryForm";
import { Box, Grid } from "theme-ui";
import useSWR from "swr";
import { ClientError } from "@/lib/client/accounts";
import { Repository } from "@/api/types";
import { DangerBox } from "@/components/repository/DangerBox";
import { AdminBox } from "@/components/repository/AdminBox";
import { useEffect, useState } from "react";
import { APIKeyList } from "@/components/account/APIKeyList";
import { APIKeyForm } from "@/components/account/APIKeyForm";

export default function RepositoryDownload() {
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

  const {
    data: repository,
    mutate: refreshRepository,
    isLoading: repositoryIsLoading,
    error: repositoryError,
  } = useSWR<Repository, ClientError>(
    account_id && repository_id
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

  return (
    <Layout
      notFound={repositoryError && repositoryError.status === 404}
      sideNavLinks={sideNavLinks}
    >
      <Grid
        sx={{
          gap: 4,
          gridTemplateColumns: [
            "1fr",
            "1fr 1fr",
            "1fr 1fr 1fr",
            "1fr 1fr 1fr 1fr",
          ],
        }}
      >
        <Box sx={{ gridColumn: "1 / -1" }}>
          <RepositoryListing repository={repository} truncate={false} />
        </Box>
        <Box sx={{ gridColumn: "1 / -1" }}>
          <EditRepositoryForm
            account_id={accountId}
            repository_id={repositoryId}
          />
        </Box>
        <Box sx={{ gridColumn: "1" }}>
          <APIKeyForm account_id={accountId} repository_id={repositoryId} />
        </Box>
        <Box
          sx={{
            gridColumn: ["span 1", "span 2", "span 2", "span 3"],
            gridRow: "span 5",
          }}
        >
          <APIKeyList account_id={accountId} repository_id={repositoryId} />
        </Box>
        <DangerBox account_id={accountId} repository_id={repositoryId} />
        <AdminBox account_id={accountId} repository_id={repositoryId} />
      </Grid>
    </Layout>
  );
}
