import React, { useState } from "react";
import useSWR from "swr";
import { Box, Text, Grid, Button, Alert } from "theme-ui";
import {
  AccountProfileResponse,
  UserSession,
  AccountFlags,
  MembershipRole,
  MembershipState,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";

export function DangerBox({ account_id }: { account_id: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const {
    mutate: refreshProfile,
    isLoading: profileIsLoading,
    error: profileError,
  } = useSWR<AccountProfileResponse, ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/profile` } : null,
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

  let hasEditPermissions = false;
  if (user && user?.account?.flags?.includes(AccountFlags.ADMIN)) {
    hasEditPermissions = true;
  } else if (user && user?.account?.account_id === account_id) {
    hasEditPermissions = true;
  } else {
    if (user) {
      for (const membership of user?.memberships) {
        if (
          membership.membership_account_id === account_id &&
          membership.state === MembershipState.Member &&
          (membership.role === MembershipRole.Owners ||
            membership.role === MembershipRole.Maintainers)
        ) {
          hasEditPermissions = true;
          break;
        }
      }
    }
  }

  if (!hasEditPermissions) {
    return <></>;
  }

  if (profileError && profileError.status === 404) {
    return <></>;
  }

  if (profileError) {
    return <Box variant="cards.componentMessage">Error loading profile</Box>;
  }

  function disableAccount() {
    const confirmed = confirm(
      "Are you sure you want to disable this account? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    fetch(`/api/v1/accounts/${account_id}`, {
      method: "DELETE",
      credentials: "include",
    }).then((res) => {
      if (!res.ok) {
        res.json().then((data) => {
          setErrorMessage(data.message);
          setSubmitting(false);
        });
      } else {
        setSubmitting(false);
        setSuccessMessage("Account Disabled");
        refreshProfile();
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
          <Text variant="formTitle">Danger Box</Text>
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
              variant="formDestructive"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                disableAccount();
              }}
            >
              Disable Account
            </Button>
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
