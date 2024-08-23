import { Layout } from "@/components/Layout";
import { useRouter } from "next/router";
import { Heading, Divider, Grid } from "theme-ui";
import { RepositoryList } from "@/components/RepositoryList";

import { getProfile } from "@/lib/client/accounts";
import { AccountObject } from "@/components/AccountObject";
import { listRepositoriesByAccount } from "@/lib/client/repositories";

export default function TenantDetails() {
  const router = useRouter();
  const { account_id } = router.query;

  const { data: profile, error } = getProfile(account_id as string);
  const { data: repositories, error: repositoriesError } =
    listRepositoriesByAccount(account_id as string);

  return (
    <>
      <Layout notFound={error && error.status === 404} sideNavLinks={[]}>
        <AccountObject profile={profile} />
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
