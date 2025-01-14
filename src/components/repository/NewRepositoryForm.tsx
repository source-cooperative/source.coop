import { useState, useEffect } from "react";
import useSWR from "swr";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AccountFlags,
  DataConnection,
  RepositoryCreationRequest,
  RepositoryCreationRequestSchema,
  RepositoryDataMode,
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
import { useRouter } from "next/router";

export function NewRepositoryForm({ account_id }: { account_id: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentDataMode, setCurrentDataMode] = useState<RepositoryDataMode>(
    RepositoryDataMode.Open
  );
  const [availableDataConnections, setAvailableDataConnections] = useState<
    Record<string, DataConnection[]>
  >({
    open: [],
    private: [],
    subscription: [],
  });

  const router = useRouter();

  const { data: dataConnections } = useSWR<DataConnection[], ClientError>(
    { path: `/api/v1/data-connections` },
    {
      refreshInterval: 0,
    }
  );

  const { data: accountFlags } = useSWR<AccountFlags[], ClientError>(
    account_id ? { path: `/api/v1/accounts/${account_id}/flags` } : null,
    {
      refreshInterval: 0,
    }
  );

  useEffect(() => {
    if (!accountFlags) {
      return;
    }

    var available = {
      open: [],
      private: [],
      subscription: [],
    };

    if (!dataConnections) {
      return;
    }

    for (const dataMode of Object.values(RepositoryDataMode)) {
      for (const dataConnection of dataConnections) {
        if (dataConnection.read_only) {
          continue;
        }

        if (!dataConnection.allowed_data_modes?.includes(dataMode)) {
          continue;
        }

        if (
          dataConnection.required_flag &&
          !accountFlags.includes(dataConnection.required_flag)
        ) {
          continue;
        }

        available[dataMode].push(dataConnection);
      }
    }
    setValue(
      "data_connection_id",
      available[currentDataMode][0].data_connection_id
    );
    setValue("data_mode", currentDataMode);
    setAvailableDataConnections(available);
  }, [dataConnections, accountFlags, currentDataMode]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RepositoryCreationRequest>({
    resolver: zodResolver(RepositoryCreationRequestSchema),
    defaultValues: {},
  });

  const onSubmit: SubmitHandler<RepositoryCreationRequest> = (data) => {
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

    fetch(`/api/v1/repositories/${account_id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }).then((res) => {
      if (res.ok) {
        setSubmitting(false);
        router.push(`/${account_id}/${data.repository_id}`);
        setSuccessMessage("Repository Created");
      } else {
        res.json().then((data) => {
          setSubmitting(false);
          setErrorMessage(data.message);
        });
      }
    });
  };

  return (
    <>
      {errorMessage && <Alert variant="error">{errorMessage}</Alert>}
      <Box as="form" onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={false}>
          <Text variant="formTitle">New Repository</Text>
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
            <Box
              variant="formField"
              sx={{ gridColumn: ["1 / -1", "1 / -1", "1", "1"] }}
            >
              <Text variant="formLabel">Repository ID</Text>
              <Input {...register("repository_id")} />
              <Text variant="formError">{errors.repository_id?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: 1 }}>
              <Text variant="formLabel">Data Mode</Text>
              <Select
                {...register("data_mode")}
                onChange={(e) =>
                  setCurrentDataMode(e.target.value as RepositoryDataMode)
                }
              >
                {Object.keys(RepositoryDataMode).map((dataMode, i) => {
                  const dataModeValue = Object.values(RepositoryDataMode)[i];

                  if (availableDataConnections[dataModeValue].length === 0) {
                    return <></>;
                  }
                  return (
                    <option key={`data-mode-${i}`} value={dataModeValue}>
                      {dataMode}
                    </option>
                  );
                })}
              </Select>
              <Text variant="formError">{errors.data_mode?.message}</Text>
            </Box>
            <Box variant="formField" sx={{ gridColumn: [1, 2, 2, 2] }}>
              <Text variant="formLabel">Data Location</Text>
              <Select {...register("data_connection_id")}>
                <option>Select Region</option>
                {availableDataConnections[currentDataMode].map(
                  (dataConnection, i) => {
                    return (
                      <option
                        key={`data-connection-${i}`}
                        value={dataConnection.data_connection_id}
                      >
                        {dataConnection.name}
                      </option>
                    );
                  }
                )}
              </Select>
              <Text variant="formError">
                {errors.data_connection_id?.message}
              </Text>
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
                Create
              </Button>
            </Box>
          </Grid>
        </fieldset>
      </Box>
    </>
  );
}
