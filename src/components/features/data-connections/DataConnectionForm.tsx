"use client";

import React, { useState, useActionState } from "react";
import { Button, Text, Flex, Checkbox } from "@radix-ui/themes";
import Form from "next/form";
import { useRouter } from "next/navigation";
import {
  DataConnection,
  DataProvider,
  DataConnectionAuthenticationType,
  S3Regions,
  AzureRegions,
  ProductVisibility,
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

// Storage providers limited to those with a `details` schema (S3, Azure).
const providerOptions: Array<{ value: DataProvider; label: string }> = [
  { value: DataProvider.S3, label: "S3" },
  { value: DataProvider.Azure, label: "Azure" },
];

const s3AuthTypes = [
  DataConnectionAuthenticationType.S3ECSTaskRole,
  DataConnectionAuthenticationType.S3AccessKey,
  DataConnectionAuthenticationType.S3WebIdentityRole,
  DataConnectionAuthenticationType.S3Local,
];

const azureAuthTypes = [
  DataConnectionAuthenticationType.AzureSasToken,
  DataConnectionAuthenticationType.AzureWorkloadIdentity,
];

const AUTH_TYPE_LABELS: Record<DataConnectionAuthenticationType, string> = {
  [DataConnectionAuthenticationType.S3AccessKey]: "Access Key",
  [DataConnectionAuthenticationType.S3WebIdentityRole]:
    "Web Identity Role (federated)",
  [DataConnectionAuthenticationType.S3ECSTaskRole]: "ECS Task Role",
  [DataConnectionAuthenticationType.S3Local]: "Local",
  [DataConnectionAuthenticationType.AzureSasToken]: "SAS Token",
  [DataConnectionAuthenticationType.AzureWorkloadIdentity]:
    "Workload Identity (federated)",
  [DataConnectionAuthenticationType.GcpWorkloadIdentity]:
    "Workload Identity (federated)",
};

function FieldErrors({ errors, name }: { errors?: string[]; name: string }) {
  if (!errors?.length) return null;
  return (
    <>
      {errors.map((error, index) => (
        <Text size="1" color="red" key={`${name}-${index}`}>
          {error}
        </Text>
      ))}
    </>
  );
}

export function DataConnectionForm({
  dataConnection,
  mode,
}: DataConnectionFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createDataConnection : updateDataConnection;

  const [state, formAction, pending] = useActionState(action, {
    message: "",
    data: new FormData(),
    fieldErrors: {},
    success: false,
  });

  // Navigate client-side after a successful submission that asks for it, so the
  // shared admin layout is refetched with the current session.
  React.useEffect(() => {
    if (state.success && state.redirectTo) {
      router.refresh();
      router.push(state.redirectTo);
    }
  }, [state.success, state.redirectTo, router]);

  const [provider, setProvider] = useState<string>(
    dataConnection?.details.provider || DataProvider.S3
  );

  const [authType, setAuthType] = useState<string>(
    dataConnection?.authentication?.type || ""
  );

  // Reset auth type when provider changes; auth options are provider-specific.
  const handleProviderChange = (value: string) => {
    setProvider(value);
    setAuthType("");
  };

  const authOptions =
    provider === DataProvider.S3 ? s3AuthTypes : azureAuthTypes;

  // Pre-fill non-secret authentication fields from the existing connection.
  // Secrets (access keys, SAS tokens) are intentionally never rendered.
  const auth = dataConnection?.authentication;
  const initialRoleArn =
    auth?.type === DataConnectionAuthenticationType.S3WebIdentityRole
      ? auth.role_arn
      : "";
  const initialTenantId =
    auth?.type === DataConnectionAuthenticationType.AzureWorkloadIdentity
      ? auth.tenant_id
      : "";
  const initialClientId =
    auth?.type === DataConnectionAuthenticationType.AzureWorkloadIdentity
      ? auth.client_id
      : "";

  const secretHint =
    mode === "edit" ? "Leave blank to keep the current value." : undefined;

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
          <FieldErrors
            name="data_connection_id"
            errors={state.fieldErrors?.data_connection_id}
          />
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
              (state.data.get("name") as string) || dataConnection?.name || ""
            }
            style={fieldStyle}
          />
          <FieldErrors name="name" errors={state.fieldErrors?.name} />
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
              "{{repository.account_id}}/{{repository.repository_id}}/"
            }
            style={fieldStyle}
          />
          <FieldErrors
            name="prefix_template"
            errors={state.fieldErrors?.prefix_template}
          />
        </Flex>

        {/* Read Only */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Read Only
          </Text>
          <Flex align="center" gap="2" asChild>
            <label>
              <Checkbox
                name="read_only"
                defaultChecked={dataConnection?.read_only || false}
              />
              <Text size="2">Connection is read-only</Text>
            </label>
          </Flex>
        </Flex>

        {/* Allowed Visibilities */}
        <Flex direction="column" gap="1">
          <Text size="3" weight="medium">
            Allowed Visibilities
          </Text>
          <Flex direction="column" gap="2">
            {Object.values(ProductVisibility).map((visibility) => (
              <Flex align="center" gap="2" asChild key={visibility}>
                <label>
                  <Checkbox
                    name={`visibility_${visibility}`}
                    defaultChecked={
                      dataConnection?.allowed_visibilities?.includes(
                        visibility
                      ) || false
                    }
                  />
                  <Text size="2">{visibility}</Text>
                </label>
              </Flex>
            ))}
          </Flex>
          <FieldErrors
            name="allowed_visibilities"
            errors={state.fieldErrors?.allowed_visibilities}
          />
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
          <FieldErrors
            name="required_flag"
            errors={state.fieldErrors?.required_flag}
          />
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
            {providerOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <FieldErrors name="provider" errors={state.fieldErrors?.provider} />
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
                  (dataConnection?.details.provider === DataProvider.S3
                    ? dataConnection.details.bucket
                    : "")
                }
                style={fieldStyle}
              />
              <FieldErrors name="bucket" errors={state.fieldErrors?.bucket} />
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
                  (dataConnection?.details.provider === DataProvider.S3
                    ? dataConnection.details.base_prefix
                    : "")
                }
                style={fieldStyle}
              />
              <FieldErrors
                name="base_prefix"
                errors={state.fieldErrors?.base_prefix}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Region
              </Text>
              <select
                name="region"
                defaultValue={
                  (state.data.get("region") as string) ||
                  (dataConnection?.details.provider === DataProvider.S3
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
              <FieldErrors name="region" errors={state.fieldErrors?.region} />
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
                  (dataConnection?.details.provider === DataProvider.Azure
                    ? dataConnection.details.account_name
                    : "")
                }
                style={fieldStyle}
              />
              <FieldErrors
                name="account_name"
                errors={state.fieldErrors?.account_name}
              />
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
                  (dataConnection?.details.provider === DataProvider.Azure
                    ? dataConnection.details.container_name
                    : "")
                }
                style={fieldStyle}
              />
              <FieldErrors
                name="container_name"
                errors={state.fieldErrors?.container_name}
              />
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
                  (dataConnection?.details.provider === DataProvider.Azure
                    ? dataConnection.details.base_prefix
                    : "")
                }
                style={fieldStyle}
              />
              <FieldErrors
                name="base_prefix"
                errors={state.fieldErrors?.base_prefix}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Region
              </Text>
              <select
                name="region"
                defaultValue={
                  (state.data.get("region") as string) ||
                  (dataConnection?.details.provider === DataProvider.Azure
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
              <FieldErrors name="region" errors={state.fieldErrors?.region} />
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
            <option value="">None (unsigned)</option>
            {authOptions.map((type) => (
              <option key={type} value={type}>
                {AUTH_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <FieldErrors name="auth_type" errors={state.fieldErrors?.auth_type} />
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
                autoComplete="off"
                required={mode === "create"}
                defaultValue={(state.data.get("access_key_id") as string) || ""}
                style={fieldStyle}
              />
              {secretHint && (
                <Text size="1" color="gray">
                  {secretHint}
                </Text>
              )}
              <FieldErrors
                name="access_key_id"
                errors={state.fieldErrors?.access_key_id}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Secret Access Key
              </Text>
              <input
                type="password"
                name="secret_access_key"
                autoComplete="new-password"
                required={mode === "create"}
                defaultValue={
                  (state.data.get("secret_access_key") as string) || ""
                }
                style={fieldStyle}
              />
              {secretHint && (
                <Text size="1" color="gray">
                  {secretHint}
                </Text>
              )}
              <FieldErrors
                name="secret_access_key"
                errors={state.fieldErrors?.secret_access_key}
              />
            </Flex>
          </>
        )}

        {authType === DataConnectionAuthenticationType.S3WebIdentityRole && (
          <Flex direction="column" gap="1">
            <Text size="3" weight="medium">
              Role ARN
            </Text>
            <input
              type="text"
              name="role_arn"
              required
              placeholder="arn:aws:iam::123456789012:role/my-role"
              defaultValue={
                (state.data.get("role_arn") as string) || initialRoleArn
              }
              style={fieldStyle}
            />
            <Text size="1" color="gray">
              The proxy assumes this role via AssumeRoleWithWebIdentity. Not a
              secret.
            </Text>
            <FieldErrors name="role_arn" errors={state.fieldErrors?.role_arn} />
          </Flex>
        )}

        {authType === DataConnectionAuthenticationType.AzureWorkloadIdentity && (
          <>
            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Tenant ID
              </Text>
              <input
                type="text"
                name="tenant_id"
                required
                placeholder="00000000-0000-0000-0000-000000000000"
                defaultValue={
                  (state.data.get("tenant_id") as string) || initialTenantId
                }
                style={fieldStyle}
              />
              <FieldErrors
                name="tenant_id"
                errors={state.fieldErrors?.tenant_id}
              />
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="3" weight="medium">
                Client ID
              </Text>
              <input
                type="text"
                name="client_id"
                required
                placeholder="00000000-0000-0000-0000-000000000000"
                defaultValue={
                  (state.data.get("client_id") as string) || initialClientId
                }
                style={fieldStyle}
              />
              <FieldErrors
                name="client_id"
                errors={state.fieldErrors?.client_id}
              />
            </Flex>
          </>
        )}

        {/* Submit */}
        <Flex mt="4" justify="end">
          <Flex direction="column" gap="2" align="end">
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
