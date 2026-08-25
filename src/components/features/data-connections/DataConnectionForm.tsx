"use client";

import React, { useState, useActionState, startTransition } from "react";
import {
  Text,
  Flex,
  Box,
  Button,
  Checkbox,
  Code,
  Select,
  TextField,
  RadioCards,
} from "@radix-ui/themes";
import { CheckIcon } from "@radix-ui/react-icons";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { useRouter } from "next/navigation";
import {
  slugifyToId,
  DataProvider,
  DataConnectionAuthenticationType,
  S3Regions,
  AzureRegions,
  ProductVisibility,
  AccountFlags,
} from "@/types";
import {
  Field,
  FormActions,
  SectionHeader,
  RadioDot,
} from "@/components/core";
import {
  createDataConnection,
  updateDataConnection,
} from "@/lib/actions/data-connections";
import type { EditableDataConnection } from "./redact";

interface DataConnectionFormProps {
  dataConnection?: EditableDataConnection;
  mode: "create" | "edit";
  // When set, the form is account-scoped: the connection is owned by this
  // account. Posts a hidden `owner`, hides the platform-only Required Flag, and
  // (on create) shows the ID namespacing prefix.
  ownerAccountId?: string;
}

// Storage providers limited to those with a `details` schema (S3, Azure, GCS).
const providerOptions: Array<{
  value: DataProvider;
  label: string;
  description: string;
}> = [
  {
    value: DataProvider.S3,
    label: "AWS S3",
    description: "Or an S3-compatible backend: Cloudflare R2, MinIO, Ceph.",
  },
  {
    value: DataProvider.Azure,
    label: "Azure Blob",
    description: "A storage account and one of its containers.",
  },
  {
    value: DataProvider.GCS,
    label: "Google Cloud",
    description: "Keyless: federated through Workload Identity.",
  },
];

const s3AuthTypes = [
  DataConnectionAuthenticationType.S3AccessKey,
  DataConnectionAuthenticationType.S3WebIdentityRole,
];

const azureAuthTypes = [
  DataConnectionAuthenticationType.AzureSasToken,
  DataConnectionAuthenticationType.AzureWorkloadIdentity,
];

const gcpAuthTypes = [DataConnectionAuthenticationType.GcpWorkloadIdentity];

const authTypesByProvider: Record<string, DataConnectionAuthenticationType[]> = {
  [DataProvider.S3]: s3AuthTypes,
  [DataProvider.Azure]: azureAuthTypes,
  [DataProvider.GCS]: gcpAuthTypes,
};

const AUTH_TYPE_LABELS: Record<DataConnectionAuthenticationType, string> = {
  [DataConnectionAuthenticationType.S3AccessKey]: "Access Key",
  [DataConnectionAuthenticationType.S3WebIdentityRole]:
    "Web Identity Role (federated)",
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
  [DataConnectionAuthenticationType.S3AccessKey]:
    "Static IAM access key and secret you provide.",
  [DataConnectionAuthenticationType.S3WebIdentityRole]:
    "Keyless: the proxy assumes a customer IAM role via web identity.",
  [DataConnectionAuthenticationType.AzureSasToken]:
    "A shared access signature token you provide.",
  [DataConnectionAuthenticationType.AzureWorkloadIdentity]:
    "Keyless: the proxy federates into an Azure AD app registration.",
  [DataConnectionAuthenticationType.GcpWorkloadIdentity]:
    "Keyless: the proxy federates into a GCP service account via Workload Identity.",
};

// Radix Select has no empty-string item value; this stands in for "unset".
const NONE = "__none__";

/**
 * Fields that exist because of a choice made above them.
 *
 * Provider and authentication method each swap out what follows. Without a rule
 * tying those fields to the control that produced them, they read as part of
 * the same flat list — and nothing suggests that choosing differently would
 * replace them.
 */
function ConditionalGroup({
  because,
  children,
}: {
  because: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      pl="4"
      style={{ borderLeft: "2px solid var(--gray-5)" }}
    >
      <Flex direction="column" gap="4">
        <Text
          size="1"
          color="gray"
          style={{
            fontFamily: "var(--code-font-family)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Because {because}
        </Text>
        {children}
      </Flex>
    </Box>
  );
}

/**
 * A write-only credential: says whether one is stored, and reveals an input only
 * when the user asks to change it.
 *
 * Rendering an empty password box in both states is what made an authenticated
 * connection indistinguishable from one with no credential at all.
 */
function SecretField({
  label,
  help,
  name,
  stored,
  required,
  errors,
  defaultValue,
}: {
  label: string;
  help: React.ReactNode;
  name: string;
  stored: boolean;
  required: boolean;
  errors?: string[];
  defaultValue: string;
}) {
  // Open when there is nothing stored to keep.
  //
  // The defaultValue clause only matters on a remount — switching auth type away
  // and back after a failed submit, where state.data still holds what was typed.
  // An ordinary failed submit does not remount this, so it simply keeps the
  // state it already had; the initializer is not what preserves that.
  const [replacing, setReplacing] = useState(!stored || defaultValue !== "");

  if (replacing) {
    return (
      <Field label={label} help={help} errors={errors} required={required}>
        {(props) => (
          <Flex gap="2" align="center">
            <TextField.Root
              {...props}
              type="password"
              name={name}
              autoComplete="new-password"
              required={required}
              defaultValue={defaultValue}
              size="3"
              style={{ flex: 1 }}
            />
            {stored && (
              <Button
                type="button"
                size="2"
                variant="soft"
                color="gray"
                onClick={() => setReplacing(false)}
              >
                Keep current
              </Button>
            )}
          </Flex>
        )}
      </Field>
    );
  }

  return (
    <Field label={label} help={help} errors={errors} group>
      <Flex
        align="center"
        justify="between"
        gap="3"
        p="3"
        style={{
          border: "1px solid var(--gray-6)",
          backgroundColor: "var(--gray-2)",
        }}
      >
        <Flex align="center" gap="2">
          <CheckIcon color="var(--green-11)" />
          <Text size="2" weight="medium">
            Stored
          </Text>
        </Flex>
        <Button
          type="button"
          size="2"
          variant="soft"
          onClick={() => setReplacing(true)}
        >
          Replace…
        </Button>
      </Flex>
    </Field>
  );
}

export function DataConnectionForm({
  dataConnection,
  mode,
  ownerAccountId,
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

  // Controlled for the same reason as the checkboxes below: a Radix Select is
  // not a native form control that re-seeds itself from `state.data` after a
  // failed submit, so the user's choice lives in state.
  const [requiredFlag, setRequiredFlag] = useState<string>(
    dataConnection?.required_flag ?? ""
  );
  const [s3Region, setS3Region] = useState<string>(
    dataConnection?.details.provider === DataProvider.S3
      ? dataConnection.details.region
      : ""
  );
  const [azureRegion, setAzureRegion] = useState<string>(
    dataConnection?.details.provider === DataProvider.Azure
      ? dataConnection.details.region
      : ""
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

  // Every provider's details carry a base_prefix; the `in` check is what
  // narrows the discriminated union to reach it without naming a provider.
  const storedBasePrefix =
    dataConnection && "base_prefix" in dataConnection.details
      ? dataConnection.details.base_prefix
      : "";

  // Controlled so the derived id below tracks what is typed.
  const [name, setName] = useState<string>(
    (state.data.get("name") as string) || dataConnection?.name || ""
  );

  /**
   * What the name will become. On edit the id is already fixed, so show the
   * real one rather than what the current name would have produced.
   */
  const derivedId =
    mode === "edit"
      ? (dataConnection?.data_connection_id ?? "")
      : (() => {
          const slug = slugifyToId(name);
          if (!slug) return "";
          return ownerAccountId ? `${ownerAccountId}--${slug}` : slug;
        })();

  // Controlled so the worked example below updates as the template is typed.
  const [prefixTemplate, setPrefixTemplate] = useState<string>(
    // has()-check, not ||: preserve a user-cleared value across a failed submit
    // instead of reverting to the stored value.
    state.data.has("prefix_template")
      ? (state.data.get("prefix_template") as string)
      : (dataConnection?.prefix_template ?? "")
  );

  /** The template with a sample product substituted in, as the proxy would. */
  const resolvedPrefixExample = prefixTemplate
    .replaceAll("{{repository.account_id}}", "example-org")
    .replaceAll("{{repository.repository_id}}", "rainfall");

  // The redacted connection carries no secret, but the presence of an
  // authentication type says one was saved — enough to tell "stored" from
  // "not set" without sending anything sensitive to the browser.
  // Shown on edit so the form says which credential is configured; it was
  // blank whether or not one existed, which is the same trap the secret fields
  // had.
  const storedAccessKeyId =
    dataConnection?.authentication?.type ===
    DataConnectionAuthenticationType.S3AccessKey
      ? dataConnection.authentication.access_key_id
      : "";

  const hasStoredSecret =
    mode === "edit" &&
    dataConnection?.authentication?.type === authType &&
    (authType === DataConnectionAuthenticationType.S3AccessKey ||
      authType === DataConnectionAuthenticationType.AzureSasToken);

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
        {ownerAccountId && (
          <input type="hidden" name="owner" value={ownerAccountId} />
        )}
        {mode === "edit" && dataConnection && (
          <input
            type="hidden"
            name="data_connection_id"
            value={dataConnection.data_connection_id}
          />
        )}
        <SectionHeader title="Identity">
          <Flex direction="column" gap="4">
            <Field
              label="Name"
              help="Shown in admin lists and in each product's storage picker."
              errors={state.fieldErrors?.name}
            >
              {(props) => (
                <TextField.Root
                  {...props}
                  type="text"
                  name="name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  size="3"
                />
              )}
            </Field>

            {/* The id is derived, not asked for — but it is permanent and shows
                up in URLs and as the storage key, so it is shown rather than
                sprung on the user after saving. */}
            <Field label="ID" group>
              <Flex align="center" gap="2">
                <Code size="2" variant="ghost" color="gray">
                  {derivedId || "—"}
                </Code>
                <Text size="1" color="gray">
                  {mode === "edit"
                    ? "Permanent; renaming does not move it."
                    : derivedId
                      ? "Made from the name. Permanent once created."
                      : "Add a few letters or numbers to the name."}
                </Text>
              </Flex>
            </Field>

          </Flex>
        </SectionHeader>

        <SectionHeader title="Backend">
          <Flex direction="column" gap="4">
            <Field
              label="Provider"
              help="Decides which connection and authentication fields apply below."
              errors={state.fieldErrors?.provider}
              group
            >
              {(props) => (
                <>
                  {/* RadioCards is not a form control, so the value posts via a
                      hidden input, as it does elsewhere in this vocabulary. */}
                  <input type="hidden" name="provider" value={provider} />
                  <RadioCards.Root
                    {...props}
                    size="1"
                    columns={{ initial: "1", sm: "3" }}
                    value={provider}
                    onValueChange={handleProviderChange}
                  >
                    {providerOptions.map((option) => (
                      <RadioCards.Item
                        key={option.value}
                        value={option.value}
                        // Radix centres item content on both axes; descriptions
                        // differ in length, so anchor them to the start.
                        style={{
                          alignItems: "flex-start",
                          justifyContent: "flex-start",
                        }}
                      >
                        <Flex align="start" gap="2" width="100%">
                          <RadioDot checked={provider === option.value} />
                          <Flex direction="column" align="start" gap="1">
                            <Text size="2" weight="medium">
                              {option.label}
                            </Text>
                            <Text size="1" color="gray">
                              {option.description}
                            </Text>
                          </Flex>
                        </Flex>
                      </RadioCards.Item>
                    ))}
                  </RadioCards.Root>
                </>
              )}
            </Field>

            {/* Provider-specific fields */}
            {provider === DataProvider.S3 && (
              <ConditionalGroup because="provider is AWS S3">
                <Field
                  label="Bucket"
                  help="Name of the S3 bucket that stores the data."
                  errors={state.fieldErrors?.bucket}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="bucket"
                      defaultValue={
                        (state.data.get("bucket") as string) ||
                        (dataConnection?.details.provider === DataProvider.S3
                          ? dataConnection.details.bucket
                          : "")
                      }
                      size="3"
                    />
                  )}
                </Field>


                <Field
                  label="Region"
                  help="AWS region the bucket is hosted in. Use “auto” for S3-compatible backends like Cloudflare R2."
                  errors={state.fieldErrors?.region}
                >
                  {(props) => (
                    <Select.Root
                      name="region"
                      size="3"
                      value={s3Region || undefined}
                      onValueChange={setS3Region}
                    >
                      <Select.Trigger
                        {...props}
                        placeholder="Select a region"
                        style={{ width: "100%" }}
                      />
                      <Select.Content>
                        {Object.values(S3Regions).map((region) => (
                          <Select.Item key={region} value={region}>
                            {region}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                </Field>

                <Field
                  label="Endpoint"
                  help="Custom S3-compatible endpoint for non-AWS backends (Cloudflare R2, MinIO, Ceph). Leave blank for AWS S3."
                  errors={state.fieldErrors?.endpoint}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="endpoint"
                      placeholder="https://<account>.r2.cloudflarestorage.com"
                      defaultValue={
                        (state.data.get("endpoint") as string) ||
                        (dataConnection?.details.provider === DataProvider.S3
                          ? dataConnection.details.endpoint ?? ""
                          : "")
                      }
                      size="3"
                    />
                  )}
                </Field>
              </ConditionalGroup>
            )}

            {provider === DataProvider.GCS && (
              <ConditionalGroup because="provider is Google Cloud">
                <Field
                  label="Bucket"
                  help="Name of the Google Cloud Storage bucket."
                  errors={state.fieldErrors?.bucket}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="bucket"
                      defaultValue={
                        (state.data.get("bucket") as string) ||
                        (dataConnection?.details.provider === DataProvider.GCS
                          ? dataConnection.details.bucket
                          : "")
                      }
                      size="3"
                    />
                  )}
                </Field>

              </ConditionalGroup>
            )}

            {provider === DataProvider.Azure && (
              <ConditionalGroup because="provider is Azure Blob">
                <Field
                  label="Account Name"
                  help="Azure Storage account name."
                  errors={state.fieldErrors?.account_name}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="account_name"
                      defaultValue={
                        (state.data.get("account_name") as string) ||
                        (dataConnection?.details.provider === DataProvider.Azure
                          ? dataConnection.details.account_name
                          : "")
                      }
                      size="3"
                    />
                  )}
                </Field>

                <Field
                  label="Container Name"
                  help="Azure Blob Storage container name."
                  errors={state.fieldErrors?.container_name}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="container_name"
                      defaultValue={
                        (state.data.get("container_name") as string) ||
                        (dataConnection?.details.provider === DataProvider.Azure
                          ? dataConnection.details.container_name
                          : "")
                      }
                      size="3"
                    />
                  )}
                </Field>


                <Field
                  label="Region"
                  help="Azure region the storage account is hosted in."
                  errors={state.fieldErrors?.region}
                >
                  {(props) => (
                    <Select.Root
                      name="region"
                      size="3"
                      value={azureRegion || undefined}
                      onValueChange={setAzureRegion}
                    >
                      <Select.Trigger
                        {...props}
                        placeholder="Select a region"
                        style={{ width: "100%" }}
                      />
                      <Select.Content>
                        {Object.values(AzureRegions).map((region) => (
                          <Select.Item key={region} value={region}>
                            {region}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                </Field>
              </ConditionalGroup>
            )}

          </Flex>
        </SectionHeader>

        <SectionHeader title="Key layout">
          <Flex direction="column" gap="4">
            <Field
              label="Base Prefix"
              help="Optional shared root inside the bucket or container. Every product on this connection sits under it. Leave blank for the root."
              errors={state.fieldErrors?.base_prefix}
            >
              {(props) => (
                <TextField.Root
                  {...props}
                  type="text"
                  name="base_prefix"
                  defaultValue={
                    (state.data.get("base_prefix") as string) || storedBasePrefix
                  }
                  size="3"
                />
              )}
            </Field>

            <Field
              label="Prefix Template"
              help="Where each product's objects land inside the bucket or container. {{repository.account_id}} and {{repository.repository_id}} are substituted when a product attaches this connection."
              errors={state.fieldErrors?.prefix_template}
            >
              {(props) => (
                <Flex direction="column" gap="2">
                  <TextField.Root
                    {...props}
                    type="text"
                    name="prefix_template"
                    value={prefixTemplate}
                    onChange={(event) => setPrefixTemplate(event.target.value)}
                    size="3"
                  />
                  {/* A worked example, rather than describing the substitution in
                      prose and leaving the reader to run it in their head. */}
                  <Box
                    p="2"
                    style={{
                      border: "1px solid var(--gray-6)",
                      backgroundColor: "var(--gray-2)",
                    }}
                  >
                    <Text as="p" size="1" color="gray">
                      A product at{" "}
                      <Code size="1" variant="ghost">
                        example-org/rainfall
                      </Code>{" "}
                      would be stored at
                    </Text>
                    <Code
                      size="1"
                      variant="ghost"
                      color="gray"
                      style={{ wordBreak: "break-all" }}
                    >
                      {resolvedPrefixExample || "(connection root)"}
                    </Code>
                  </Box>
                </Flex>
              )}
            </Field>

          </Flex>
        </SectionHeader>

        <SectionHeader title="Authentication">
          <Flex direction="column" gap="4">
            <Field
              label="Authentication Type"
              help={
                (authType && AUTH_TYPE_DESCRIPTIONS[authType as DataConnectionAuthenticationType]) ||
                "How the data proxy authenticates to this backend when serving the product's data. Choose None for unsigned (public) access."
              }
              errors={state.fieldErrors?.auth_type}
            >
              {(props) => (
                <>
                  <input type="hidden" name="auth_type" value={authType} />
                  <Select.Root
                    size="3"
                    value={authType || NONE}
                    onValueChange={(value) => setAuthType(value === NONE ? "" : value)}
                  >
                    <Select.Trigger
                      {...props}
                      style={{ width: "100%" }}
                    />
                    <Select.Content>
                      <Select.Item value={NONE}>None (unsigned)</Select.Item>
                      {authOptions.map((type) => (
                        <Select.Item key={type} value={type}>
                          {AUTH_TYPE_LABELS[type]}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </>
              )}
            </Field>

            {/* Auth-specific fields */}
            {authType === DataConnectionAuthenticationType.S3AccessKey && (
              <ConditionalGroup because="method is Access Key">
                <Field
                  label="Access Key ID"
                  help="Identifies which credential is in use. Not a secret — it is the paired secret access key that is never shown."
                  errors={state.fieldErrors?.access_key_id}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="access_key_id"
                      autoComplete="off"
                      required={mode === "create"}
                      defaultValue={
                        (state.data.get("access_key_id") as string) ||
                        storedAccessKeyId
                      }
                      size="3"
                    />
                  )}
                </Field>

                <SecretField
                  label="Secret Access Key"
                  help="Paired with the access key ID. Stored encrypted and never shown again."
                  name="secret_access_key"
                  stored={hasStoredSecret}
                  required={mode === "create"}
                  errors={state.fieldErrors?.secret_access_key}
                  defaultValue={
                    (state.data.get("secret_access_key") as string) || ""
                  }
                />
              </ConditionalGroup>
            )}

            {authType === DataConnectionAuthenticationType.AzureSasToken && (
              <ConditionalGroup because="method is SAS Token">
                <SecretField
                label="SAS Token"
                help="Shared access signature granting access to the container. Stored encrypted and never shown again."
                name="sas_token"
                stored={hasStoredSecret}
                required={mode === "create"}
                errors={state.fieldErrors?.sas_token}
                  defaultValue={(state.data.get("sas_token") as string) || ""}
                />
              </ConditionalGroup>
            )}

            {authType === DataConnectionAuthenticationType.S3WebIdentityRole && (
              <ConditionalGroup because="method is Web Identity Role">
                <Field
                  label="Role ARN"
                  help="IAM role the proxy assumes via AssumeRoleWithWebIdentity (keyless federation). This is an ARN, not a secret."
                  errors={state.fieldErrors?.role_arn}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="role_arn"
                      required
                      placeholder="arn:aws:iam::123456789012:role/my-role"
                      defaultValue={
                        (state.data.get("role_arn") as string) || initialRoleArn
                      }
                      size="3"
                    />
                  )}
                </Field>

                {mode === "edit" && (
                  <Field
                    label="Trust-policy subject"
                    help={
                      <>
                        The proxy presents this OIDC subject when assuming the role.
                        In the role&apos;s trust policy, add a{" "}
                        <Text weight="medium">StringLike</Text> condition on{" "}
                        <Text weight="medium">data.source.coop:sub</Text> matching
                        it, alongside{" "}
                        <Text weight="medium">
                          data.source.coop:aud = sts.amazonaws.com
                        </Text>
                        .
                      </>
                    }
                    group
                  >
                    <Flex align="center" gap="2">
                      <Code size="2" variant="soft">
                        {subPattern}
                      </Code>
                      <CopyToClipboard text={subPattern} />
                    </Flex>
                  </Field>
                )}
              </ConditionalGroup>
            )}

            {authType === DataConnectionAuthenticationType.AzureWorkloadIdentity && (
              <ConditionalGroup because="method is Workload Identity">
                <Field
                  label="Tenant ID"
                  help="Azure AD tenant (directory) ID used for workload-identity federation."
                  errors={state.fieldErrors?.tenant_id}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="tenant_id"
                      required
                      placeholder="00000000-0000-0000-0000-000000000000"
                      defaultValue={
                        (state.data.get("tenant_id") as string) || initialTenantId
                      }
                      size="3"
                    />
                  )}
                </Field>

                <Field
                  label="Client ID"
                  help="App registration (client) ID that holds the federated identity credential."
                  errors={state.fieldErrors?.client_id}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="client_id"
                      required
                      placeholder="00000000-0000-0000-0000-000000000000"
                      defaultValue={
                        (state.data.get("client_id") as string) || initialClientId
                      }
                      size="3"
                    />
                  )}
                </Field>
              </ConditionalGroup>
            )}

            {authType ===
              DataConnectionAuthenticationType.GcpWorkloadIdentity && (
              <ConditionalGroup because="method is Workload Identity">
                <Field
                  label="Workload Identity Provider"
                  help="Full GCP Workload Identity provider resource. Not a secret."
                  errors={state.fieldErrors?.workload_identity_provider}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="workload_identity_provider"
                      required
                      placeholder="//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/provider"
                      defaultValue={
                        (state.data.get("workload_identity_provider") as string) ||
                        initialWorkloadIdentityProvider
                      }
                      size="3"
                    />
                  )}
                </Field>

                <Field
                  label="Service Account"
                  help="Email of the GCP service account the proxy impersonates. Not a secret."
                  errors={state.fieldErrors?.service_account}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="service_account"
                      required
                      placeholder="sa@my-project.iam.gserviceaccount.com"
                      defaultValue={
                        (state.data.get("service_account") as string) ||
                        initialServiceAccount
                      }
                      size="3"
                    />
                  )}
                </Field>
              </ConditionalGroup>
            )}

          </Flex>
        </SectionHeader>

        <SectionHeader title="Policy">
          <Flex direction="column" gap="4">
            <Field
              label="Read Only"
              help="Prevents products from writing or modifying data through this connection — browse and download only. Required for unsigned (no-auth) connections."
              errors={state.fieldErrors?.read_only}
              group
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
              help="Which visibilities a product on this connection may use. Checked when a product is created and whenever its visibility changes."
              errors={state.fieldErrors?.allowed_visibilities}
              group
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

            {/* Required Flag is a platform-only gate; hidden on owned connections. */}
            {!ownerAccountId && (
              <Field
                label="Required Flag"
                help="Account flag an owner must hold before this connection can back their products. Choose None for no restriction."
                errors={state.fieldErrors?.required_flag}
              >
                {(props) => (
                  <>
                    {/* The Select is UI only; the hidden input carries "" for None,
                        which Radix cannot express as an item value. */}
                    <input type="hidden" name="required_flag" value={requiredFlag} />
                    <Select.Root
                      size="3"
                      value={requiredFlag || NONE}
                      onValueChange={(value) =>
                        setRequiredFlag(value === NONE ? "" : value)
                      }
                    >
                      <Select.Trigger
                        {...props}
                        style={{ width: "100%" }}
                      />
                      <Select.Content>
                        <Select.Item value={NONE}>None</Select.Item>
                        {Object.values(AccountFlags).map((flag) => (
                          <Select.Item key={flag} value={flag}>
                            {flag}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </>
                )}
              </Field>
            )}

          </Flex>
        </SectionHeader>

        <FormActions
          submitLabel={mode === "create" ? "Create Connection" : "Update Connection"}
          pending={pending}
          message={state?.message}
          success={state.success}
        />
      </Flex>
    </form>
  );
}
