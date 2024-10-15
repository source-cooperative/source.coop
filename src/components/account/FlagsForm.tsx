import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Text, Grid, Flex, Button, Alert, Divider } from "theme-ui";
import {
  AccountFlags,
  AccountProfileResponse,
  AccountType,
  UserSession,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";
import { z } from "zod";

export function FlagsForm({ account_id }: { account_id: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const {
    data: accountFlags,
    isLoading: accountFlagsIsLoading,
    error: accountFlagsError,
  } = useSWR<AccountFlags, ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/flags` } : null,
    {
      refreshInterval: 0,
    }
  );

  const { data: accountProfile } = useSWR<AccountProfileResponse, ClientError>(
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

  const FlagsSchema = z.object({
    admin: z.boolean(),
    create_organizations: z.boolean(),
    create_repositories: z.boolean(),
  });

  type Flags = z.infer<typeof FlagsSchema>;

  const { register, handleSubmit, reset } = useForm<Flags>({
    resolver: zodResolver(FlagsSchema),
    defaultValues: {},
  });

  useEffect(() => {
    var newFlags = {};
    if (accountFlags) {
      for (const key of Object.values(AccountFlags)) {
        if (accountFlags.includes(key)) {
          newFlags[key] = true;
        } else {
          newFlags[key] = false;
        }
      }
      reset(newFlags);
    }
  }, [accountFlags]);

  const onSubmit: SubmitHandler<Flags> = (data) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    var userFlags = [];
    for (const [key, value] of Object.entries(data)) {
      if (value === true) {
        userFlags.push(key);
      }
    }
    fetch(`/api/v1/accounts/${account_id}/flags`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userFlags),
    }).then((res) => {
      setSubmitting(false);
      if (!res.ok) {
        res.json().then((data) => {
          setErrorMessage(data.message);
        });
      } else {
        setSuccessMessage("Saved");
      }
    });
  };

  if (!user || !user?.account?.flags.includes(AccountFlags.ADMIN)) {
    return <></>;
  }

  if (accountFlagsError) {
    return <Box variant="cards.componentMessage">Error loading flags</Box>;
  }

  return (
    <Box>
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={false}>
          <Text variant="formTitle">Flags</Text>

          <Grid variant="form">
            {(errorMessage || successMessage) && (
              <Box variant="cards.formMessageBox">
                {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
                {successMessage && (
                  <Alert variant="success">{successMessage}</Alert>
                )}
              </Box>
            )}
            {accountProfile?.account_type === AccountType.USER && (
              <>
                <Box sx={{ gridColumn: 1 }}>
                  <Text sx={{ fontWeight: "bold" }}>Account</Text>
                  <Divider sx={{ my: 0 }} />
                </Box>
                <Box variant="formField" sx={{ gridColumn: 1 }}>
                  <Flex sx={{ alignItems: "center", gap: 1 }}>
                    <input type="checkbox" {...register(AccountFlags.ADMIN)} />
                    <Text variant="formLabel">Admin</Text>
                  </Flex>
                </Box>
              </>
            )}
            <Box sx={{ gridColumn: 1, mt: 2 }}>
              <Text sx={{ fontWeight: "bold" }}>Features</Text>
              <Divider sx={{ my: 0 }} />
            </Box>
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Flex sx={{ alignItems: "center", gap: 1 }}>
                <input
                  type="checkbox"
                  {...register(AccountFlags.CREATE_REPOSITORIES)}
                />
                <Text variant="formLabel">Create Repositories</Text>
              </Flex>
            </Box>
            {accountProfile?.account_type === AccountType.USER && (
              <>
                <Box variant="formField" sx={{ gridColumn: 1 }}>
                  <Flex sx={{ alignItems: "center", gap: 1 }}>
                    <input
                      type="checkbox"
                      {...register(AccountFlags.CREATE_ORGANIZATIONS)}
                    />
                    <Text variant="formLabel">Create Organizations</Text>
                  </Flex>
                </Box>
              </>
            )}
            <Box sx={{ textAlign: "right", gridColumn: "1 / -1" }}>
              <Button disabled={submitting} variant="formSubmit">
                Save
              </Button>
            </Box>
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
