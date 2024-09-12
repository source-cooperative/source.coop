import { APIKey, RedactedAPIKey } from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import useSWR from "swr";
import { Box, Text, Grid, Button, Alert, Paragraph } from "theme-ui";
import { useEffect, useState } from "react";

export function APIKeyList({ account_id }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [latestAPIKey, setLatestAPIKey] = useState(null);

  useEffect(() => {
    const key = localStorage.getItem("latest-api-key")
      ? JSON.parse(localStorage.getItem("latest-api-key"))
      : null;
    setLatestAPIKey(key);
  }, []);

  const {
    data: apiKeys,
    mutate: reloadAPIKeys,
    error,
  } = useSWR<RedactedAPIKey[], ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/api-keys` } : null,
    {
      refreshInterval: 0,
    }
  );

  if (error && error.status === 401) {
    return (
      <Box variant="cards.componentMessage">
        You do not have permissions to view this account's API Keys
      </Box>
    );
  }

  return (
    <Box>
      <Box as="form">
        <fieldset disabled={submitting}>
          <Text variant="formTitle">API Keys</Text>
          <Grid variant="form" sx={{ gap: 4 }}>
            {errorMessage ||
              (successMessage && (
                <Box variant="cards.formMessageBox">
                  {errorMessage && (
                    <Alert variant="error">{errorMessage}</Alert>
                  )}
                  {successMessage && (
                    <Alert variant="success">{successMessage}</Alert>
                  )}
                </Box>
              ))}
            {apiKeys && apiKeys.length === 0 && (
              <Box variant="cards.componentMessage">
                This account has no active API Keys
              </Box>
            )}
            {apiKeys &&
              apiKeys.map((apiKey) => (
                <Grid
                  key={apiKey.access_key_id}
                  variant="cards.formCard"
                  sx={{
                    gridTemplateColumns: ["1fr", "1fr", "1fr auto", "1fr auto"],
                  }}
                >
                  <Box>
                    <Paragraph sx={{ fontFamily: "mono", my: 0 }}>
                      Name: {apiKey.disabled ? "[DISABLED] " : ""}
                      {apiKey.name}
                    </Paragraph>
                    <Paragraph sx={{ fontFamily: "mono", my: 0 }}>
                      Access Key ID: {apiKey.access_key_id}
                    </Paragraph>
                    <Paragraph sx={{ fontFamily: "mono", my: 0 }}>
                      Secret Access Key:{" "}
                      {latestAPIKey &&
                      latestAPIKey?.access_key_id === apiKey.access_key_id
                        ? latestAPIKey.secret_access_key
                        : "<REDACTED>"}
                    </Paragraph>
                    <Paragraph sx={{ fontFamily: "mono", my: 0 }}>
                      Expires: {apiKey.expires}
                    </Paragraph>
                  </Box>

                  <Button
                    variant="formDestructive"
                    sx={{
                      height: "fit-content",
                      alignSelf: "center",
                    }}
                    onClick={async () => {
                      setSubmitting(true);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      fetch(`/api/v1/api-keys//${apiKey.access_key_id}`, {
                        method: "DELETE",
                      }).then((res) => {
                        if (res.ok) {
                          setSubmitting(false);
                          setSuccessMessage("API Key Revoked");
                          reloadAPIKeys();
                        } else {
                          res.json().then((data) => {
                            setSubmitting(false);
                            setErrorMessage(data.message);
                          });
                        }
                      });
                    }}
                  >
                    Revoke
                  </Button>
                </Grid>
              ))}
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
