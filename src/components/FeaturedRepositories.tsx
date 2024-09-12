import { RepositoryListing } from "@/components/RepositoryListing";
import { Heading, Grid, Box } from "theme-ui";
import { RepositoryListResponse } from "@/api/types";
import useSWR from "swr";

export default function FeaturedRepositories() {
  const { data: repositories, error: isError } = useSWR<
    RepositoryListResponse,
    Error
  >(
    { path: "/api/v1/repositories/featured" },
    {
      refreshInterval: 0,
    }
  );

  return (
    <Box>
      <Heading as="h1" sx={{ textAlign: "center" }}>
        Featured Repositories
      </Heading>
      {isError ? (
        <Heading as="h2">Failed to load Featured Repositories</Heading>
      ) : (
        <Grid>
          {(repositories ? repositories.repositories : [null, null, null]).map(
            (repository, i) => {
              return (
                <RepositoryListing
                  key={`repository-${i}`}
                  repository={repository}
                  truncate={true}
                />
              );
            }
          )}
        </Grid>
      )}
    </Box>
  );
}
