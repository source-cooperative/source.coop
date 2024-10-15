import {
  UserSession,
  MembershipRole,
  MembershipState,
  AccountFlags,
  APIKeyRequest,
  APIKeyRequestSchema,
  RedactedAPIKey,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import useSWR from "swr";
import { Box, Text, Grid, Select, Input, Alert, Button } from "theme-ui";
import { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export function APIKeyForm({
  account_id,
  repository_id,
}: {
  account_id: string;
  repository_id?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { mutate: reloadAPIKeys } = useSWR<RedactedAPIKey[], ClientError>(
    account_id && !repository_id
      ? { path: `/api/v1/accounts/${account_id}/api-keys` }
      : account_id && repository_id
      ? { path: `/api/v1/repositories/${account_id}/${repository_id}/api-keys` }
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<APIKeyRequest>({
    resolver: zodResolver(APIKeyRequestSchema),
    defaultValues: {
      expires: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  const onSubmit: SubmitHandler<APIKeyRequest> = (data) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (account_id && !repository_id) {
      fetch(`/api/v1/accounts/${account_id}/api-keys`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            localStorage.setItem("latest-api-key", JSON.stringify(data));
            setSubmitting(false);
            setSuccessMessage("API Key Created");
            reloadAPIKeys();
          });
        } else {
          res.json().then((data) => {
            setSubmitting(false);
            setErrorMessage(data.message);
          });
        }
      });
    } else if (account_id && repository_id) {
      fetch(`/api/v1/repositories/${account_id}/${repository_id}/api-keys`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            localStorage.setItem("latest-api-key", JSON.stringify(data));
            setSubmitting(false);
            setSuccessMessage("API Key Created");
            reloadAPIKeys();
          });
        } else {
          res.json().then((data) => {
            setSubmitting(false);
            setErrorMessage(data.message);
          });
        }
      });
    }
  };

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
          !membership.repository_id &&
          membership.state === MembershipState.Member &&
          (membership.role === MembershipRole.Owners ||
            membership.role === MembershipRole.Maintainers)
        ) {
          hasEditPermissions = true;
          break;
        }
      }

      if (repository_id) {
        for (const membership of user?.memberships) {
          if (
            membership.membership_account_id === account_id &&
            membership.repository_id === repository_id &&
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
  }

  if (!hasEditPermissions) {
    return <></>;
  }

  return (
    <Box>
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={submitting}>
          <Text variant="formTitle">Create API Key</Text>
          <Grid variant="form">
            {(errorMessage || successMessage) && (
              <Box variant="cards.formMessageBox">
                {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
                {successMessage && (
                  <Alert variant="success">{successMessage}</Alert>
                )}
              </Box>
            )}
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Text variant="formLabel">Name</Text>
              <Input {...register("name")} />
              <Text variant="formError">{errors.name?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Text variant="formLabel">Expires</Text>
              <Input {...register("expires")} />
              <Text variant="formError">{errors.expires?.message}</Text>
            </Box>

            <Box variant="cards.formButtonBox" sx={{ gridColumns: "1 / -1" }}>
              <Button variant="formSubmit">Create</Button>
            </Box>
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
