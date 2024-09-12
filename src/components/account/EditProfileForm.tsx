import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Text, Grid, Input, Textarea, Button, Alert } from "theme-ui";
import {
  AccountProfileResponse,
  AccountProfile,
  AccountProfileSchema,
} from "@/api/types";
import { ClientError } from "@/lib/client/accounts";

export function EditProfileForm({ account_id }: { account_id: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const {
    data: profile,
    mutate: refreshProfile,
    isLoading: profileIsLoading,
    error: profileError,
  } = useSWR<AccountProfileResponse, ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/profile` } : null,
    {
      refreshInterval: 0,
    }
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountProfile>({
    resolver: zodResolver(AccountProfileSchema),
    defaultValues: profile,
  });

  useEffect(() => {
    reset(profile);
  }, [profile]);

  const onSubmit: SubmitHandler<AccountProfile> = (data) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    fetch(`/api/v1/accounts/${account_id}/profile`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }).then((res) => {
      setSubmitting(false);
      if (!res.ok) {
        res.json().then((data) => {
          setErrorMessage(data.message);
        });
      } else {
        setSuccessMessage("Saved");
        refreshProfile();
      }
    });
  };

  if (profileIsLoading) {
    return <Box variant="cards.componentMessage">Loading...</Box>;
  }

  if (profileError && profileError.status === 404) {
    return <Box variant="cards.componentMessage">Account not found</Box>;
  }

  if (profileError) {
    return (
      <Box variant="cards.componentMessage">Error loading account profile</Box>
    );
  }

  return (
    <Box>
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={submitting}>
          <Text variant="formTitle">Profile</Text>
          <Grid
            variant="form"
            sx={{
              gridTemplateColumns: ["1fr", "1fr", "1fr 1fr", "1fr 1fr 1fr 1fr"],
            }}
          >
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
            <Box variant="formField" sx={{ gridColumn: "span 2" }}>
              <Text variant="formLabel">Name</Text>
              <Input {...register("name")} />
              <Text variant="formError">{errors.name?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: "1 / -1" }}>
              <Text variant="formLabel">Bio</Text>
              <Textarea rows={8} {...register("bio")} />
              <Text variant="formError">{errors.bio?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Text variant="formLabel">Location</Text>
              <Input {...register("location")} />
              <Text variant="formError">{errors.location?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Text variant="formLabel">URL</Text>
              <Input {...register("url")} />
              <Text variant="formError">{errors.url?.message}</Text>
            </Box>
            <Box variant="cards.formButtonBox" sx={{ gridColumn: "1 / -1" }}>
              <Button variant="formSubmit">Save</Button>
            </Box>
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
