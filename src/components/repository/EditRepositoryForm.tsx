import { useState, useEffect } from "react";
import useSWR from "swr";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Repository,
  RepositoryCreationRequest,
  RepositoryState,
  RepositoryUpdateRequest,
  RepositoryUpdateRequestSchema,
} from "@/api/types";
import {
  Alert,
  Box,
  Text,
  Grid,
  Textarea,
  Select,
  Button,
  Input,
} from "theme-ui";
import { ClientError } from "@/lib/client/accounts";
import {
  MembershipState,
  MembershipRole,
  AccountFlags,
  UserSession,
} from "@/api/types";

export function EditRepositoryForm({
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

  useEffect(() => {
    if (!repository) {
      return;
    }

    var cleanedTags = [];
    for (const tag of repository.meta?.tags) {
      if (tag.length > 0) {
        cleanedTags.push(tag);
      }
    }

    setValue("state", repository.state);
    setValue("meta", repository.meta);
    // @ts-ignore
    setValue("meta.tags", cleanedTags.join(","));
  }, [repository]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RepositoryUpdateRequest>({
    resolver: zodResolver(RepositoryUpdateRequestSchema),
    defaultValues: repository,
  });

  const onSubmit: SubmitHandler<RepositoryUpdateRequest> = (data) => {
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    var cleanedTags = [];
    for (const tag of data.meta?.tags) {
      if (tag.length > 0) {
        cleanedTags.push(tag);
      }
    }
    // @ts-ignore
    data.meta.tags = cleanedTags.join(",");

    fetch(`/api/v1/repositories/${account_id}/${repository_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }).then((res) => {
      if (res.ok) {
        setSubmitting(false);
        refreshRepository();
        setSuccessMessage("Saved");
      } else {
        res.json().then((data) => {
          setSubmitting(false);
          setErrorMessage(data.message);
        });
      }
    });
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
        } else if (
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

  if (!hasEditPermissions) {
    return <></>;
  }

  if (repositoryError && repositoryError.status === 404) {
    return <></>;
  }

  if (!repository) {
    return <></>;
  }

  if (repositoryError) {
    return <Box variant="cards.componentMessage">Error loading repository</Box>;
  }

  return (
    <>
      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={false}>
          <Text variant="formTitle">Edit Repository</Text>
          <Grid
            variant="form"
            sx={{
              gridTemplateColumns: [
                "1fr",
                "1fr 2fr",
                "1fr 2fr 2fr",
                "1fr 2fr 2fr",
              ],
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
            <Box variant="formField" sx={{ gridColumn: "1" }}>
              <Text variant="formLabel">State</Text>
              <Select {...register("state")}>
                <option value={RepositoryState.Listed}>Listed</option>
                <option value={RepositoryState.Unlisted}>Unlisted</option>
              </Select>
              <Text variant="formError">{errors.state?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: "1 / span 2" }}>
              <Text variant="formLabel">Title</Text>
              <Input {...register("meta.title")} />
              <Text variant="formError">{errors.meta?.title?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: "1 / -1" }}>
              <Text variant="formLabel">Description</Text>
              <Textarea rows={8} {...register("meta.description")} />
              <Text variant="formError">
                {errors.meta?.description?.message}
              </Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: "1 / -1" }}>
              <Text variant="formLabel">Tags</Text>
              <Input {...register("meta.tags")} />
              <Text variant="formError">{errors.meta?.tags?.message}</Text>
            </Box>
            <Box sx={{ textAlign: "right", gridColumn: "1 / -1" }}>
              <Button disabled={submitting} variant="formSubmit">
                Save
              </Button>
            </Box>
          </Grid>
        </fieldset>
      </Box>
    </>
  );
}
