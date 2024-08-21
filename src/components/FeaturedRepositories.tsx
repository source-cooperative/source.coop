import { RepositoryListing } from "@/components/RepositoryListing";
import { Heading, Grid, Box } from "theme-ui";

import { listFeaturedRepositories } from "@/lib/client/repositories";

export default function FeaturedRepositories() {
  const { data: repositories, error: isError } = listFeaturedRepositories();

  return (
    <Box>
      <Heading as="h1" sx={{ textAlign: "center" }}>
        Featured Repositories
      </Heading>
      {isError ? (
        <Heading as="h2">Failed to load Featured Repositories</Heading>
      ) : (
        <Grid>
          {(repositories ? repositories : [null, null, null]).map(
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
