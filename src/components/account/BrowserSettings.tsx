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
import { useColorMode } from "theme-ui";

export function BrowserSettings({ account_id }: { account_id: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [colorMode, setColorMode] = useColorMode();

  const { data: user } = useSWR<UserSession, ClientError>(
    { path: `/api/v1/whoami` },
    {
      refreshInterval: 0,
    }
  );

  if (account_id !== user?.account?.account_id) {
    return <></>;
  }

  function toggleDarkMode() {
    setColorMode(colorMode === "light" ? "dark" : "light");
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
          <Text variant="formTitle">Browser Settings</Text>
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
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                toggleDarkMode();
              }}
            >
              Toggle Dark Mode
            </Button>
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
