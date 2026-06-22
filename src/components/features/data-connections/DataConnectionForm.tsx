"use client";

import React, { useState, useActionState, startTransition } from "react";
import { Button, Text, Flex, Checkbox, Code } from "@radix-ui/themes";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { useRouter } from "next/navigation";
import {
  DataProvider,
  DataConnectionAuthenticationType,
  S3Regions,
  AzureRegions,
  ProductVisibility,
  AccountFlags,
} from "@/types";
import { formFieldStyle as fieldStyle } from "@/components/core/DynamicForm";
import {
  createDataConnection,
  updateDataConnection,
} from "@/lib/actions/data-connections";
import type { EditableDataConnection } from "./redact";

interface DataConnectionFormProps {
  dataConnection?: EditableDataConnection;
  mode: "create" | "edit";
}

// Storage providers limited to those with a `details` schema (S3, Azure, GCP).
const providerOptions: Array<{ value: DataProvider; label: string }> = [
  { value: DataProvider.S3, label: "S3 / S3-compatible (R2, MinIO)" },
  { value: DataProvider.Azure, label: "Azure" },
  { value: DataProvider.GCP, label: "GCP (GCS)" },
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

const gcpAuthTypes = [DataConnectionAuthenticationType.GcpWorkloadIdentity];

const authTypesByProvider: Record<string, DataConnectionAuthenticationType[]> = {
  [DataProvider.S3]: s3AuthTypes,
  [DataProvider.Azure]: azureAuthTypes,
  [DataProvider.GCP]: gcpAuthTypes,
};

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

// One-line description of what each authentication type means, shown under the
// Authentication Type select so the admin knows what they're choosing.
const AUTH_TYPE_DESCRIPTIONS: Partial<
  Record<DataConnectionAuthenticationType, string>
> = {
  [DataConnectionAuthenticationType.S3ECSTaskRole]:
    "Use the proxy's ECS task role — no stored credentials.",
  [DataConnectionAuthenticationType.S3AccessKey]:
    "Static IAM access key and secret you provide.",
  [DataConnectionAuthenticationType.S3WebIdentityRole]:
    "Keyless: the proxy assumes a customer IAM role via web identity.",
  [DataConnectionAuthenticationType.S3Local]:
    "Local/dev credential chain — no stored credentials.",
  [DataConnectionAuthenticationType.AzureSasToken]:
    "A shared access signature token you provide.",
  [DataConnectionAuthenticationType.AzureWorkloadIdentity]:
    "Keyless: the proxy federates into an Azure AD app registration.",
  [DataConnectionAuthenticationType.GcpWorkloadIdentity]:
    "Keyless: the proxy federates into a GCP service account via Workload Identity.",
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

/**
 * Labelled field wrapper: renders the label, a gray description of what the
 * field does, the control, and any server-side validation errors.
 */
function Field({
  label,
  name,
  description,
  errors,
  children,
}: {
  label: string;
  name: string;
  description?: React.ReactNode;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="1">
      <Text size="3" weight="medium">
        {label}
      </Text>
      {description && (
        <Text size="1" color="gray">
          {description}
        </Text>
      )}
      {children}
      <FieldErrors name={name} errors={errors} />
    </Flex>
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

  // Controlled so the user's selections survive a re-render after a failed
  // submit. React 19 resets uncontrolled form fields once the action returns;
  // text inputs re-seed from `state.data`, but checkboxes can't (there's no way
  // to tell "unchecked" from "absent"), so they must be controlled.
  const [readOnly, setReadOnly] = useState<boolean>(
    dataConnection?.read_only ?? false
  );
  const [visibilities, setVisibilities] = useState<Set<string>>(
    () => new Set(dataConnection?.allowed_visibilities ?? [])
  );
  const toggleVisibility = (visibility: string, checked: boolean) =>
    setVisibilities((prev) => {
      const next = new Set(prev);
      if (checked) next.add(visibility);
      else next.delete(visibility);
      return next;
    });

  // Reset auth type when provider changes; auth options are provider-specific.
  const handleProviderChange = (value: string) => {
    setProvider(value);
    setAuthType("");
  };

  const authOptions = authTypesByProvider[provider] ?? s3AuthTypes;

  // Pre-fill non-secret authentication fields from the existing connection.
  // Secrets (access keys, SAS tokens) are intentionally never rendered.
  const auth = dataConnection?.authentication;
  const initialRoleArn =
    auth?.type === DataConnectionAuthenticationType.S3WebIdentityRole
      ? auth.role_arn
      : "";
  // OIDC subject the proxy presents; owners match it in their IAM trust policy.
  const subPattern = `scv1:conn:${dataConnection?.data_connection_id ?? ""}:*`;
  const initialTenantId =
    auth?.type === DataConnectionAuthenticationType.AzureWorkloadIdentity
      ? auth.tenant_id
      : "";
  const initialClientId =
    auth?.type === DataConnectionAuthenticationType.AzureWorkloadIdentity
      ? auth.client_id
      : "";
  const initialWorkloadIdentityProvider =
    auth?.type === DataConnectionAuthenticationType.GcpWorkloadIdentity
      ? auth.workload_identity_provider
      : "";
  const initialServiceAccount =
    auth?.type === DataConnectionAuthenticationType.GcpWorkloadIdentity
      ? auth.service_account
      : "";

  // Secret fields are never pre-filled; on edit, blank means "keep current".
  const withSecretHint = (base: string) =>
    mode === "edit" ? `${base} Leave blank to keep the current value.` : base;

  // Dispatch the action from onSubmit (in a transition) rather than via the
  // form's `action` prop. React auto-resets a form after an `action` submit,
  // and that reset snaps controlled <select>/checkbox fields (auth_type,
  // provider, read_only, visibilities) back to their first option/default —
  // here auth_type stuck on "None" after save (facebook/react#31695). This is
  // the maintainer-recommended opt-out; mirrors the DynamicForm fix (#373).
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="4">
        <Field
          label="Connection ID"
          name="data_connection_id"
          description="Unique identifier used in URLs and as the storage key. Lowercase letters, numbers, and hyphens only; cannot be changed after creation."
          errors={state.fieldErrors?.data_connection_id}
        >
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
        </Field>

        <Field
          label="Name"
          name="name"
          description="Human-readable label shown in admin lists and the product mirror picker."
          errors={state.fieldErrors?.name}
        >
          <input
            type="text"
            name="name"
            required
            defaultValue={
              (state.data.get("name") as string) || dataConnection?.name || ""
            }
            style={fieldStyle}
          />
        </Field>

        <Field
          label="Prefix Template"
          name="prefix_template"
          description="Template for the object-key prefix each product receives within the bucket/container. {{repository.account_id}} and {{repository.repository_id}} are substituted when a product attaches this connection."
          errors={state.fieldErrors?.prefix_template}
        >
          <input
            type="text"
            name="prefix_template"
            defaultValue={
              // has()-check, not ||: preserve a user-cleared value across a
              // failed submit instead of reverting to the stored value.
              state.data.has("prefix_template")
                ? (state.data.get("prefix_template") as string)
                : mode === "create"
                  ? // Creating: pre-fill the default so admins don't retype it.
                    "{{repository.account_id}}/{{repository.repository_id}}/"
                  : // Editing: show the stored value, empty if it was cleared.
                    // Don't fall back to the default, or a cleared prefix would
                    // reappear on reload.
                    (dataConnection?.prefix_template ?? "")
            }
            style={fieldStyle}
          />
        </Field>

        <Field
          label="Read Only"
          name="read_only"
          description="Prevents products from writing or modifying data through this connection — browse and download only."
        >
          <Flex align="center" gap="2" asChild>
            <label>
              <Checkbox
                name="read_only"
                checked={readOnly}
                onCheckedChange={(checked) => setReadOnly(checked === true)}
              />
              <Text size="2">Connection is read-only</Text>
            </label>
          </Flex>
        </Field>

        <Field
          label="Allowed Visibilities"
          name="allowed_visibilities"
          description="Product visibilities permitted to use this connection. (Not currently enforced.)"
          errors={state.fieldErrors?.allowed_visibilities}
        >
          <Flex direction="column" gap="2">
            {Object.values(ProductVisibility).map((visibility) => (
              <Flex align="center" gap="2" asChild key={visibility}>
                <label>
                  <Checkbox
                    name={`visibility_${visibility}`}
                    checked={visibilities.has(visibility)}
                    onCheckedChange={(checked) =>
                      toggleVisibility(visibility, checked === true)
                    }
                  />
                  <Text size="2">{visibility}</Text>
                </label>
              </Flex>
            ))}
          </Flex>
        </Field>

        <Field
          label="Required Flag"
          name="required_flag"
          description="Account flag a user must have for their products to use this connection. Choose None for no restriction. (Not currently enforced.)"
          errors={state.fieldErrors?.required_flag}
        >
          <select
            name="required_flag"
            defaultValue={
              // has()-check, not ||: a user-selected "None" ("") must survive a
              // failed submit instead of reverting to the stored flag.
              state.data.has("required_flag")
                ? (state.data.get("required_flag") as string)
                : (dataConnection?.required_flag ?? "")
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
        </Field>

        <Field
          label="Provider"
          name="provider"
          description="Storage backend type. Determines the connection and authentication fields shown below."
          errors={state.fieldErrors?.provider}
        >
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
        </Field>

        {/* Provider-specific fields */}
        {provider === DataProvider.S3 && (
          <>
            <Field
              label="Bucket"
              name="bucket"
              description="Name of the S3 bucket that stores the data."
              errors={state.fieldErrors?.bucket}
            >
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
            </Field>

            <Field
              label="Base Prefix"
              name="base_prefix"
              description="Optional key prefix prepended to every object path in the bucket (a shared root folder). Leave blank for the bucket root."
              errors={state.fieldErrors?.base_prefix}
            >
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
            </Field>

            <Field
              label="Region"
              name="region"
              description="AWS region the bucket is hosted in. Use “auto” for S3-compatible backends like Cloudflare R2."
              errors={state.fieldErrors?.region}
            >
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
            </Field>

            <Field
              label="Endpoint"
              name="endpoint"
              description="Custom S3-compatible endpoint for non-AWS backends (Cloudflare R2, MinIO, Ceph). Leave blank for AWS S3."
              errors={state.fieldErrors?.endpoint}
            >
              <input
                type="text"
                name="endpoint"
                placeholder="https://<account>.r2.cloudflarestorage.com"
                defaultValue={
                  (state.data.get("endpoint") as string) ||
                  (dataConnection?.details.provider === DataProvider.S3
                    ? dataConnection.details.endpoint ?? ""
                    : "")
                }
                style={fieldStyle}
              />
            </Field>
          </>
        )}

        {provider === DataProvider.GCP && (
          <>
            <Field
              label="Bucket"
              name="bucket"
              description="Name of the Google Cloud Storage bucket."
              errors={state.fieldErrors?.bucket}
            >
              <input
                type="text"
                name="bucket"
                defaultValue={
                  (state.data.get("bucket") as string) ||
                  (dataConnection?.details.provider === DataProvider.GCP
                    ? dataConnection.details.bucket
                    : "")
                }
                style={fieldStyle}
              />
            </Field>

            <Field
              label="Base Prefix"
              name="base_prefix"
              description="Optional key prefix prepended to every object path in the bucket. Leave blank for the bucket root."
              errors={state.fieldErrors?.base_prefix}
            >
              <input
                type="text"
                name="base_prefix"
                defaultValue={
                  (state.data.get("base_prefix") as string) ||
                  (dataConnection?.details.provider === DataProvider.GCP
                    ? dataConnection.details.base_prefix
                    : "")
                }
                style={fieldStyle}
              />
            </Field>
          </>
        )}

        {provider === DataProvider.Azure && (
          <>
            <Field
              label="Account Name"
              name="account_name"
              description="Azure Storage account name."
              errors={state.fieldErrors?.account_name}
            >
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
            </Field>

            <Field
              label="Container Name"
              name="container_name"
              description="Azure Blob Storage container name."
              errors={state.fieldErrors?.container_name}
            >
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
            </Field>

            <Field
              label="Base Prefix"
              name="base_prefix"
              description="Optional key prefix prepended to every object path in the container. Leave blank for the container root."
              errors={state.fieldErrors?.base_prefix}
            >
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
            </Field>

            <Field
              label="Region"
              name="region"
              description="Azure region the storage account is hosted in."
              errors={state.fieldErrors?.region}
            >
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
            </Field>
          </>
        )}

        <Field
          label="Authentication Type"
          name="auth_type"
          description={
            (authType && AUTH_TYPE_DESCRIPTIONS[authType as DataConnectionAuthenticationType]) ||
            "How the data proxy authenticates to this backend when serving the product's data. Choose None for unsigned (public) access."
          }
          errors={state.fieldErrors?.auth_type}
        >
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
        </Field>

        {/* Auth-specific fields */}
        {authType === DataConnectionAuthenticationType.S3AccessKey && (
          <>
            <Field
              label="Access Key ID"
              name="access_key_id"
              description={withSecretHint(
                "AWS access key ID for static-credential access."
              )}
              errors={state.fieldErrors?.access_key_id}
            >
              <input
                type="text"
                name="access_key_id"
                autoComplete="off"
                required={mode === "create"}
                defaultValue={(state.data.get("access_key_id") as string) || ""}
                style={fieldStyle}
              />
            </Field>

            <Field
              label="Secret Access Key"
              name="secret_access_key"
              description={withSecretHint(
                "AWS secret access key paired with the access key ID. Never shown after saving."
              )}
              errors={state.fieldErrors?.secret_access_key}
            >
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
            </Field>
          </>
        )}

        {authType === DataConnectionAuthenticationType.AzureSasToken && (
          <Field
            label="SAS Token"
            name="sas_token"
            description={withSecretHint(
              "Azure shared access signature granting access to the container. Never shown after saving."
            )}
            errors={state.fieldErrors?.sas_token}
          >
            <input
              type="password"
              name="sas_token"
              autoComplete="new-password"
              required={mode === "create"}
              defaultValue={(state.data.get("sas_token") as string) || ""}
              style={fieldStyle}
            />
          </Field>
        )}

        {authType === DataConnectionAuthenticationType.S3WebIdentityRole && (
          <>
            <Field
              label="Role ARN"
              name="role_arn"
              description="IAM role the proxy assumes via AssumeRoleWithWebIdentity (keyless federation). This is an ARN, not a secret."
              errors={state.fieldErrors?.role_arn}
            >
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
            </Field>

            {mode === "edit" && (
              <Field
                label="Trust-policy subject"
                name="sub_pattern"
                description={
                  <>
                    The proxy presents this OIDC subject when assuming the role.
                    In the role&apos;s trust policy, add a{" "}
                    <Text weight="medium">StringLike</Text> condition on{" "}
                    <Text weight="medium">data.source.coop:sub</Text> matching
                    it, alongside{" "}
                    <Text weight="medium">
                      data.source.coop:aud = source-coop-data-proxy
                    </Text>
                    .
                  </>
                }
              >
                <Flex align="center" gap="2">
                  <Code size="2" variant="soft">
                    {subPattern}
                  </Code>
                  <CopyToClipboard text={subPattern} />
                </Flex>
              </Field>
            )}
          </>
        )}

        {authType === DataConnectionAuthenticationType.AzureWorkloadIdentity && (
          <>
            <Field
              label="Tenant ID"
              name="tenant_id"
              description="Azure AD tenant (directory) ID used for workload-identity federation."
              errors={state.fieldErrors?.tenant_id}
            >
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
            </Field>

            <Field
              label="Client ID"
              name="client_id"
              description="App registration (client) ID that holds the federated identity credential."
              errors={state.fieldErrors?.client_id}
            >
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
            </Field>
          </>
        )}

        {authType ===
          DataConnectionAuthenticationType.GcpWorkloadIdentity && (
          <>
            <Field
              label="Workload Identity Provider"
              name="workload_identity_provider"
              description="Full GCP Workload Identity provider resource. Not a secret."
              errors={state.fieldErrors?.workload_identity_provider}
            >
              <input
                type="text"
                name="workload_identity_provider"
                required
                placeholder="//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/provider"
                defaultValue={
                  (state.data.get("workload_identity_provider") as string) ||
                  initialWorkloadIdentityProvider
                }
                style={fieldStyle}
              />
            </Field>

            <Field
              label="Service Account"
              name="service_account"
              description="Email of the GCP service account the proxy impersonates. Not a secret."
              errors={state.fieldErrors?.service_account}
            >
              <input
                type="text"
                name="service_account"
                required
                placeholder="sa@my-project.iam.gserviceaccount.com"
                defaultValue={
                  (state.data.get("service_account") as string) ||
                  initialServiceAccount
                }
                style={fieldStyle}
              />
            </Field>
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
    </form>
  );
}
