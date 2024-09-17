import { Button, Grid, Box, Card, Text } from "theme-ui";
import { RepositoryListing } from "./RepositoryListing";
import { Repository, RepositoryListResponse } from "@/api/types";
import useSWR, { SWRResponse } from "swr";
import { ClientError } from "@/lib/client/accounts";
import { useState } from "react";

export function RepositoryList({
  title = "Repositories",
  featured,
  account_id,
  page,
  limit,
  tags,
  search,
}: {
  title?: string;
  featured?: boolean;
  account_id?: string;
  page?: number;
  limit?: number;
  tags?: string[];
  search?: string;
}) {
  let res: SWRResponse<RepositoryListResponse, ClientError>;
  const [currentPage, setPage] = useState(page);

  if (account_id) {
    res = useSWR<RepositoryListResponse, ClientError>(
      account_id ? { path: `/api/v1/repositories/${account_id}` } : null,
      {
        refreshInterval: 0,
      }
    );
  } else if (featured) {
    res = useSWR<RepositoryListResponse, ClientError>(
      { path: `/api/v1/repositories/featured` },
      {
        refreshInterval: 0,
      }
    );
  } else {
    res = useSWR<RepositoryListResponse, ClientError>(
      {
        path: `/api/v1/repositories`,
        args: {
          next: currentPage,
          limit,
          tags: tags?.join(","),
          search,
        },
      },
      {
        refreshInterval: 0,
      }
    );
  }

  const { data: repositoryListResponse, isLoading, error } = res;

  if (isLoading) {
    return (
      <>
        <Text variant="formTitle">{title}</Text>
        <Card variant="code">
          <Box variant="cards.componentMessage">Loading...</Box>
        </Card>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Text variant="formTitle">{title}</Text>
        <Card variant="code">
          <Box variant="cards.componentMessage">Error Loading Repositories</Box>
        </Card>
      </>
    );
  }

  if (repositoryListResponse?.repositories?.length === 0) {
    return (
      <>
        <Text variant="formTitle">Repositories</Text>
        <Card variant="code">
          <Box variant="cards.componentMessage">No Repositories Found</Box>
        </Card>
      </>
    );
  }

  return (
    <>
      <Text variant="formTitle">{title}</Text>
      <Card variant="code">
        <Grid sx={{ gap: 4, gridTemplateColumns: "1fr 1fr" }}>
          {repositoryListResponse?.repositories.map(
            (repository: Repository, i: number) => {
              return (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <RepositoryListing
                    key={i}
                    repository={repository}
                    truncate={true}
                  />
                </Box>
              );
            }
          )}
          {currentPage > 1 && (
            <Button
              onClick={() => setPage(currentPage - 1)}
              sx={{ width: "fit-content", justifySelf: "left", gridColumn: 1 }}
            >
              prev
            </Button>
          )}
          {repositoryListResponse?.next && (
            <Button
              onClick={() => setPage(currentPage + 1)}
              sx={{ width: "fit-content", justifySelf: "right", gridColumn: 2 }}
            >
              Next
            </Button>
          )}
        </Grid>
      </Card>
    </>
  );
}
