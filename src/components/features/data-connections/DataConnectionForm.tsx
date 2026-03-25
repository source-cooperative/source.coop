"use client";

import React, { useState, useActionState } from "react";
import { Button, Text, Flex, Checkbox } from "@radix-ui/themes";
import Form from "next/form";
import {
  DataConnection,
  DataProvider,
  DataConnectionAuthenticationType,
  S3Regions,
  AzureRegions,
  RepositoryDataMode,
  AccountFlags,
} from "@/types";
import {
  createDataConnection,
  updateDataConnection,
} from "@/lib/actions/data-connections";

interface DataConnectionFormProps {
  dataConnection?: DataConnection;
  mode: "create" | "edit";
}

const fieldStyle: React.CSSProperties = {
  fontFamily: "var(--code-font-family)",
  width: "100%",
  padding: "8px 12px",
  borderRadius: "0",
  border: "1px solid var(--gray-6)",
  fontSize: "16px",
  lineHeight: "1.5",
  boxSizing: "border-box",
};

const s3AuthTypes = [
  DataConnectionAuthenticationType.S3ECSTaskRole,
  DataConnectionAuthenticationType.S3AccessKey,
  DataConnectionAuthenticationType.S3IAMRole,
  DataConnectionAuthenticationType.S3Local,
];

const azureAuthTypes = [DataConnectionAuthenticationType.AzureSasToken];

export function DataConnectionForm({
  dataConnection,
  mode,
}: DataConnectionFormProps) {
  const action = mode === "create" ? createDataConnection : updateDataConnection;

  const [state, formAction, pending] = useActionState(action, {
    message: "",
    data: new FormData(),
    fieldErrors: {},
    success: false,
  });

  const [provider, setProvider] = useState<string>(
    dataConnection?.details.provider || DataProvider.S3
  );

  const [authType, setAuthType] = useState<string>(
    dataConnection?.authentication?.type || ""
  );

  // Reset auth type when provider changes
  const handleProviderChange = (value: string) => {
    setProvider(value);
    setAuthType("");
  };

  const authOptions =
    provider === DataProvider.S3 ? s3AuthTypes : azureAuthTypes;

  return (
    <Form action={formAction}>
      <Flex direction="column" gap="4">
        {/* Connection ID */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Connection ID
          </Text>
          <input
            type="text"
            name="data_connection_id"
            required
            placeholder="my-data-connection"
            readOnly={mode === "edit"}
            defaultValue={
              (state.data.get("data_connection_id") as string) ||
              dataConnection?.data_connection_id ||
              ""
            }
            style={{
              ...fieldStyle,
              ...(mode === "edit"
                ? { backgroundColor: "var(--gray-3)", cursor: "not-allowed" }
                : {}),
            }}
          />
          {state.fieldErrors?.data_connection_id?.map(
            (error: string, index: number) => (
              <Text size="1" color="red" key={`data_connection_id-${index}`}>
                {error}
              </Text>
            )
          )}
        </Flex>

        {/* Name */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Name
          </Text>
          <input
            type="text"
            name="name"
            required
            defaultValue={
              (state.data.get("name") as string) ||
              dataConnection?.name ||
              ""
            }
            style={fieldStyle}
          />
          {state.fieldErrors?.name?.map((error: string, index: number) => (
            <Text size="1" color="red" key={`name-${index}`}>
              {error}
            </Text>
          ))}
        </Flex>

        {/* Prefix Template */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Prefix Template
          </Text>
          <input
            type="text"
            name="prefix_template"
            defaultValue={
              (state.data.get("prefix_template") as string) ||
              dataConnection?.prefix_template ||
              "{account_id}/{repository_id}/"
            }
            style={fieldStyle}
          />
          {state.fieldErrors?.prefix_template?.map(
            (error: string, index: number) => (
              <Text size="1" color="red" key={`prefix_template-${index}`}>
                {error}
              </Text>
            )
          )}
        </Flex>

        {/* Read Only */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Read Only
          </Text>
          <Flex align="center" gap="2">
            <Checkbox
              name="read_only"
              defaultChecked={dataConnection?.read_only || false}
            />
            <Text size="2">Connection is read-only</Text>
          </Flex>
        </Flex>

        {/* Allowed Data Modes */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Allowed Data Modes
          </Text>
          <Flex direction="column" gap="2">
            {Object.values(RepositoryDataMode).map((modeValue) => (
              <Flex align="center" gap="2" key={modeValue}>
                <Checkbox
                  name={`mode_${modeValue}`}
                  defaultChecked={
                    dataConnection?.allowed_data_modes?.includes(modeValue) ||
                    false
                  }
                />
                <Text size="2">{modeValue}</Text>
              </Flex>
            ))}
          </Flex>
          {state.fieldErrors?.allowed_data_modes?.map(
            (error: string, index: number) => (
              <Text size="1" color="red" key={`allowed_data_modes-${index}`}>
                {error}
              </Text>
            )
          )}
        </Flex>

        {/* Required Flag */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Required Flag
          </Text>
          <select
            name="required_flag"
            defaultValue={
              (state.data.get("required_flag") as string) ||
              dataConnection?.required_flag ||
              ""
            }
            style={fieldStyle}
          >
            <option value="">None</option>
            {Object.values(AccountFlags).map((flag) => (
              <option key={flag} value={flag}>
                {flag}
              </option>
            ))}
          </select>
          {state.fieldErrors?.required_flag?.map(
            (error: string, index: number) => (
              <Text size="1" color="red" key={`required_flag-${index}`}>
                {error}
              </Text>
            )
          )}
        </Flex>

        {/* Provider */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Provider
          </Text>
          <select
            name="provider"
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value)}
            style={fieldStyle}
          >
            {Object.values(DataProvider).map((p) => (
              <option key={p} value={p}>
                {p === DataProvider.S3
                  ? "S3"
                  : p === DataProvider.Azure
                    ? "Azure"
                    : p}
              </option>
            ))}
          </select>
          {state.fieldErrors?.provider?.map(
            (error: string, index: number) => (
              <Text size="1" color="red" key={`provider-${index}`}>
                {error}
              </Text>
            )
          )}
        </Flex>

        {/* Provider-specific fields */}
        {provider === DataProvider.S3 && (
          <>
            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Bucket
              </Text>
              <input
                type="text"
                name="bucket"
                defaultValue={
                  (state.data.get("bucket") as string) ||
                  (dataConnection?.details.provider === "s3"
                    ? dataConnection.details.bucket
                    : "")
                }
                style={fieldStyle}
              />
              {state.fieldErrors?.bucket?.map(
                (error: string, index: number) => (
                  <Text size="1" color="red" key={`bucket-${index}`}>
                    {error}
                  </Text>
                )
              )}
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Base Prefix
              </Text>
              <input
                type="text"
                name="base_prefix"
                defaultValue={
                  (state.data.get("base_prefix") as string) ||
                  (dataConnection?.details.provider === "s3"
                    ? dataConnection.details.base_prefix
                    : "")
                }
                style={fieldStyle}
              />
              {state.fieldErrors?.base_prefix?.map(
                (error: string, index: number) => (
                  <Text size="1" color="red" key={`base_prefix-${index}`}>
                    {error}
                  </Text>
                )
              )}
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Region
              </Text>
              <select
                name="region"
                defaultValue={
                  (state.data.get("region") as string) ||
                  (dataConnection?.details.provider === "s3"
                    ? dataConnection.details.region
                    : "")
                }
                style={fieldStyle}
              >
                <option value="" disabled>
                  Select a region
                </option>
                {Object.values(S3Regions).map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.region?.map(
                (error: string, index: number) => (
                  <Text size="1" color="red" key={`region-${index}`}>
                    {error}
                  </Text>
                )
              )}
            </Flex>
          </>
        )}

        {provider === DataProvider.Azure && (
          <>
            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Account Name
              </Text>
              <input
                type="text"
                name="account_name"
                defaultValue={
                  (state.data.get("account_name") as string) ||
                  (dataConnection?.details.provider === "az"
                    ? dataConnection.details.account_name
                    : "")
                }
                style={fieldStyle}
              />
              {state.fieldErrors?.account_name?.map(
                (error: string, index: number) => (
                  <Text size="1" color="red" key={`account_name-${index}`}>
                    {error}
                  </Text>
                )
              )}
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Container Name
              </Text>
              <input
                type="text"
                name="container_name"
                defaultValue={
                  (state.data.get("container_name") as string) ||
                  (dataConnection?.details.provider === "az"
                    ? dataConnection.details.container_name
                    : "")
                }
                style={fieldStyle}
              />
              {state.fieldErrors?.container_name?.map(
                (error: string, index: number) => (
                  <Text size="1" color="red" key={`container_name-${index}`}>
                    {error}
                  </Text>
                )
              )}
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Base Prefix
              </Text>
              <input
                type="text"
                name="base_prefix"
                defaultValue={
                  (state.data.get("base_prefix") as string) ||
                  (dataConnection?.details.provider === "az"
                    ? dataConnection.details.base_prefix
                    : "")
                }
                style={fieldStyle}
              />
              {state.fieldErrors?.base_prefix?.map(
                (error: string, index: number) => (
                  <Text size="1" color="red" key={`base_prefix-${index}`}>
                    {error}
                  </Text>
                )
              )}
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Region
              </Text>
              <select
                name="region"
                defaultValue={
                  (state.data.get("region") as string) ||
                  (dataConnection?.details.provider === "az"
                    ? dataConnection.details.region
                    : "")
                }
                style={fieldStyle}
              >
                <option value="" disabled>
                  Select a region
                </option>
                {Object.values(AzureRegions).map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.region?.map(
                (error: string, index: number) => (
                  <Text size="1" color="red" key={`region-${index}`}>
                    {error}
                  </Text>
                )
              )}
            </Flex>
          </>
        )}

        {/* Authentication Type */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Authentication Type
          </Text>
          <select
            name="auth_type"
            value={authType}
            onChange={(e) => setAuthType(e.target.value)}
            style={fieldStyle}
          >
            <option value="" disabled>
              Select authentication type
            </option>
            {authOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {state.fieldErrors?.auth_type?.map(
            (error: string, index: number) => (
              <Text size="1" color="red" key={`auth_type-${index}`}>
                {error}
              </Text>
            )
          )}
        </Flex>

        {/* Auth-specific fields */}
        {authType === DataConnectionAuthenticationType.S3AccessKey && (
          <>
            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Access Key ID
              </Text>
              <input
                type="text"
                name="access_key_id"
                defaultValue={
                  (state.data.get("access_key_id") as string) || ""
                }
                style={fieldStyle}
              />
              {state.fieldErrors?.access_key_id?.map(
                (error: string, index: number) => (
                  <Text size="1" color="red" key={`access_key_id-${index}`}>
                    {error}
                  </Text>
                )
              )}
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Secret Access Key
              </Text>
              <input
                type="password"
                name="secret_access_key"
                defaultValue={
                  (state.data.get("secret_access_key") as string) || ""
                }
                style={fieldStyle}
              />
              {state.fieldErrors?.secret_access_key?.map(
                (error: string, index: number) => (
                  <Text
                    size="1"
                    color="red"
                    key={`secret_access_key-${index}`}
                  >
                    {error}
                  </Text>
                )
              )}
            </Flex>
          </>
        )}

        {authType === DataConnectionAuthenticationType.AzureSasToken && (
          <Flex direction="column" gap="1">
            <Text size="3" weight="medium">
              SAS Token
            </Text>
            <input
              type="password"
              name="sas_token"
              defaultValue={(state.data.get("sas_token") as string) || ""}
              style={fieldStyle}
            />
            {state.fieldErrors?.sas_token?.map(
              (error: string, index: number) => (
                <Text size="1" color="red" key={`sas_token-${index}`}>
                  {error}
                </Text>
              )
            )}
          </Flex>
        )}

        {/* Submit */}
        <Flex mt="4" justify="end">
          <Flex direction="column" gap="2">
            <Button size="3" type="submit" disabled={pending} loading={pending}>
              {mode === "create" ? "Create Connection" : "Update Connection"}
            </Button>
            {state?.message && (
              <Text size="1" color={state.success ? "green" : "red"}>
                {state.message}
              </Text>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Form>
  );
}
