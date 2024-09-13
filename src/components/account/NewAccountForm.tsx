import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Text,
  Grid,
  Input,
  Textarea,
  Button,
  Alert,
  Select,
} from "theme-ui";
import {
  AccountCreationRequestSchema,
  AccountCreationRequest,
  AccountType,
} from "@/api/types";
import { COUNTRIES } from "@/lib/constants";
import { useRouter } from "next/navigation";

export function NewAccountForm() {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountCreationRequest>({
    resolver: zodResolver(AccountCreationRequestSchema),
    defaultValues: {
      account_type: AccountType.ORGANIZATION,
    },
  });

  const onSubmit: SubmitHandler<AccountCreationRequest> = (data) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    fetch(`/api/v1/accounts`, {
      method: "POST",
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
        router.push(`/${data.account_id}`);
        setSuccessMessage("Created");
      }
    });
  };

  return (
    <Box>
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={submitting}>
          <Text variant="formTitle">New Organization</Text>
          <Grid
            variant="form"
            sx={{
              gridTemplateColumns: ["1fr", "1fr", "1fr 1fr", "1fr 1fr 1fr 1fr"],
            }}
          >
            {(errorMessage || successMessage) && (
              <Box variant="cards.formMessageBox">
                {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
                {successMessage && (
                  <Alert variant="success">{successMessage}</Alert>
                )}
              </Box>
            )}
            <Box variant="formField" sx={{ gridColumn: "1 / span 1" }}>
              <Text variant="formLabel">Account ID</Text>
              <Input {...register("account_id")} />
              <Text variant="formError">{errors.account_id?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: "1 / span 2" }}>
              <Text variant="formLabel">Name</Text>
              <Input {...register("profile.name")} />
              <Text variant="formError">{errors.profile?.name?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: "1 / -1" }}>
              <Text variant="formLabel">Bio</Text>
              <Textarea rows={8} {...register("profile.bio")} />
              <Text variant="formError">{errors.profile?.bio?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Text variant="formLabel">Location</Text>
              <Select {...register("profile.location")}>
                {COUNTRIES.map((country, i) => {
                  return (
                    <option key={i} value={country.value}>
                      {country.label}
                    </option>
                  );
                })}
              </Select>
            </Box>
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Text variant="formLabel">URL</Text>
              <Input {...register("profile.url")} />
              <Text variant="formError">{errors.profile?.url?.message}</Text>
            </Box>
            <Box variant="cards.formButtonBox" sx={{ gridColumn: "1 / -1" }}>
              <Button variant="formSubmit">Create</Button>
            </Box>
          </Grid>
        </fieldset>
      </Box>
    </Box>
  );
}
