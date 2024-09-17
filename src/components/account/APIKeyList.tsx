import { APIKey, RedactedAPIKey } from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import useSWR from "swr";
import {
  Box,
  Text,
  Grid,
  Button,
  Alert,
  Paragraph,
  Card,
  Input,
} from "theme-ui";
import { useEffect, useRef, useState } from "react";
import React from "react";
import { useCopyToClipboard } from "usehooks-ts";

function CopyableInput({ title, value }: { title: string; value: string }) {
  const ref = useRef(null);
  const [copiedText, copy] = useCopyToClipboard();
  const [copyText, setCopyText] = useState("Copy");

  return (
    <>
      <Box variant="formField" sx={{ gridColumn: 1 }}>
        <Text variant="formLabel">{title}</Text>
        <Input ref={ref} value={value} variant="readonly" disabled={true} />
      </Box>
      <Button
        sx={{ height: "fit-content", alignSelf: "flex-end" }}
        onClick={(e) => {
          e.preventDefault();
          copy(ref.current.value);
          setCopyText("Copied");
        }}
      >
        {copyText}
      </Button>
    </>
  );
}

export function APIKeyList({
  account_id,
  repository_id,
}: {
  account_id: string;
  repository_id?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [latestAPIKey, setLatestAPIKey] = useState(null);

  const {
    data: apiKeys,
    mutate: reloadAPIKeys,
    error,
    isLoading,
  } = useSWR<RedactedAPIKey[], ClientError>(
    account_id && !repository_id
      ? { path: `/api/v1/accounts/${account_id}/api-keys` }
      : account_id && repository_id
      ? { path: `/api/v1/repositories/${account_id}/${repository_id}/api-keys` }
      : null,
    {
      refreshInterval: 0,
    }
  );

  useEffect(() => {
    const key = localStorage.getItem("latest-api-key")
      ? JSON.parse(localStorage.getItem("latest-api-key"))
      : null;
    setLatestAPIKey(key);
  }, [apiKeys]);

  if (error && error.status === 401) {
    return <></>;
  }

  if (isLoading) {
    return <Box variant="cards.componentMessage">Loading API Keys...</Box>;
  }

  if (error) {
    return <Box variant="cards.componentMessage">Failed to load API Keys</Box>;
  }

  return (
    <Box>
      <Box as="form">
        <fieldset disabled={submitting}>
          <Text variant="formTitle">API Keys</Text>
          <Grid sx={{ gap: 3 }}>
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
              <Card variant="form">
                <Box variant="cards.componentMessage">
                  This account has no active API Keys
                </Box>
              </Card>
            )}
            {apiKeys &&
              apiKeys
                .sort((a, b) => {
                  if (a.access_key_id === latestAPIKey?.access_key_id) {
                    return -1;
                  } else return 1;
                })
                .map((apiKey) => {
                  return (
                    <>
                      <Box key={`api-key-${apiKey.access_key_id}`}>
                        <Grid
                          variant="form"
                          sx={{ gridTemplateColumns: "1fr auto" }}
                        >
                          <Box variant="formField" sx={{ gridColumn: 1 }}>
                            <Text variant="formLabel">Name</Text>
                            <Input
                              value={apiKey.name}
                              variant="readonly"
                              disabled={true}
                            />
                          </Box>
                          <CopyableInput
                            title="Access Key ID"
                            value={apiKey.access_key_id}
                          />
                          <CopyableInput
                            title="Secret Access Key"
                            value={
                              latestAPIKey &&
                              latestAPIKey?.access_key_id ===
                                apiKey.access_key_id
                                ? latestAPIKey.secret_access_key
                                : "<REDACTED>"
                            }
                          />
                          <Box variant="formField" sx={{ gridColumn: 1 }}>
                            <Text variant="formLabel">Expires On</Text>
                            <Input
                              value={apiKey.expires}
                              variant="readonly"
                              disabled={true}
                            />
                          </Box>
                          <Box
                            variant="cards.formButtonBox"
                            sx={{
                              gridColumn: "1 / -1",
                              justifyContent: "left",
                            }}
                          >
                            <Button
                              variant="formDestructive"
                              sx={{
                                height: "fit-content",
                                alignSelf: "center",
                              }}
                              disabled={apiKey.disabled}
                              onClick={async () => {
                                setSubmitting(true);
                                setErrorMessage(null);
                                setSuccessMessage(null);
                                fetch(
                                  `/api/v1/api-keys/${apiKey.access_key_id}`,
                                  {
                                    method: "DELETE",
                                  }
                                ).then((res) => {
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
                          </Box>
                        </Grid>
                      </Box>
                    </>
                  );
                })}
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
