import React, { useState } from "react";
import useSWR from "swr";
import { Box, Text, Grid, Button, Alert } from "theme-ui";
import {
  AccountProfileResponse,
  UserSession,
  AccountFlags,
  MembershipRole,
  MembershipState,
  Repository,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";

export function AdminBox({
  account_id,
  repository_id,
}: {
  account_id: string;
  repository_id: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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

  const { data: user } = useSWR<UserSession, ClientError>(
    { path: `/api/v1/whoami` },
    {
      refreshInterval: 0,
    }
  );

  let hasAdminPermissions = false;
  if (user && user?.account?.flags?.includes(AccountFlags.ADMIN)) {
    hasAdminPermissions = true;
  }

  if (!hasAdminPermissions) {
    return <></>;
  }

  if (repositoryError && repositoryError.status === 404) {
    return <></>;
  }

  if (repositoryError) {
    return <Box variant="cards.componentMessage">Error loading repository</Box>;
  }

  if (!repository) {
    return <></>;
  }

  function featureRepository() {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    fetch(`/api/v1/repositories/${account_id}/${repository_id}/featured`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        featured: repository.featured === 1 ? 0 : 1,
      }),
    }).then((res) => {
      if (!res.ok) {
        res.json().then((data) => {
          setErrorMessage(data.message);
          setSubmitting(false);
        });
      } else {
        setSubmitting(false);
        setSuccessMessage("Saved");
        refreshRepository();
      }
    });
  }

  return (
    <Box>
      <Box
        as="form"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <fieldset disabled={submitting}>
          <Text variant="formTitle">Admin</Text>
          <Grid variant="form">
            {(errorMessage || successMessage) && (
              <Box variant="cards.formMessageBox">
                {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
                {successMessage && (
                  <Alert variant="success">{successMessage}</Alert>
                )}
              </Box>
            )}
            <Button
              variant={
                repository.featured === 1 ? "formDestructive" : "formSuccess"
              }
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                featureRepository();
              }}
            >
              {repository.featured === 1 ? "Unfeature" : "Feature"}
            </Button>
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
