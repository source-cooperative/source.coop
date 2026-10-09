"use client";

import React, { useState, useActionState, startTransition } from "react";
import {
  Text,
  Flex,
  Box,
  Switch,
  CheckboxCards,
  Code,
  Select,
  TextField,
  RadioCards,
} from "@radix-ui/themes";
import { CopyToClipboard } from "@/components/core/CopyToClipboard";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  ConditionalGroup,
  Field,
  FormActions,
  SectionHeader,
  RadioDot,
  SecretField,
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
// Labels are product names and stay untranslated.
const providerOptions = [
  {
    value: DataProvider.S3,
    label: "AWS S3",
    descriptionKey: "providerS3Description",
  },
  {
    value: DataProvider.Azure,
    label: "Azure Blob",
    descriptionKey: "providerAzureDescription",
  },
  {
    value: DataProvider.GCS,
    label: "Google Cloud",
    descriptionKey: "providerGcsDescription",
  },
] as const;

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

const AUTH_TYPE_LABELS = {
  [DataConnectionAuthenticationType.S3AccessKey]: "authAccessKey",
  [DataConnectionAuthenticationType.S3WebIdentityRole]: "authWebIdentityRole",
  [DataConnectionAuthenticationType.AzureSasToken]: "authSasToken",
  [DataConnectionAuthenticationType.AzureWorkloadIdentity]:
    "authWorkloadIdentity",
  [DataConnectionAuthenticationType.GcpWorkloadIdentity]: "authWorkloadIdentity",
} as const;

// One-line description of what each authentication type means, shown under the
// Authentication Type select so the admin knows what they're choosing.
const AUTH_TYPE_DESCRIPTIONS = {
  [DataConnectionAuthenticationType.S3AccessKey]: "authAccessKeyDescription",
  [DataConnectionAuthenticationType.S3WebIdentityRole]:
    "authWebIdentityRoleDescription",
  [DataConnectionAuthenticationType.AzureSasToken]: "authSasTokenDescription",
  [DataConnectionAuthenticationType.AzureWorkloadIdentity]:
    "authAzureWorkloadIdentityDescription",
  [DataConnectionAuthenticationType.GcpWorkloadIdentity]:
    "authGcpWorkloadIdentityDescription",
} as const;

/**
 * Where a product's objects land: backend root, the connection's shared base
 * prefix, then the resolved prefix template.
 *
 * Split and rejoined rather than concatenated — each segment may or may not
 * carry a slash of its own, and a doubled or missing one in an object key is
 * not cosmetic.
 */
export function exampleLocation(
  backendRoot: string,
  basePrefix: string,
  resolvedTemplate: string
): string {
  const segments = [basePrefix, resolvedTemplate]
    .flatMap((part) => part.split("/"))
    .filter(Boolean);
  // Nothing to append: the location is the backend root itself, and adding a
  // separator to an empty tail would double the slash.
  if (segments.length === 0) return `${backendRoot}/`;
  // A template naming a folder keeps its trailing slash.
  const trailingSlash = !resolvedTemplate || resolvedTemplate.endsWith("/");
  return `${backendRoot}/${segments.join("/")}${trailingSlash ? "/" : ""}`;
}

// Radix Select has no empty-string item value; this stands in for "unset".
const NONE = "__none__";

export function DataConnectionForm({
  dataConnection,
  mode,
  ownerAccountId,
}: DataConnectionFormProps) {
  const router = useRouter();
  const t = useTranslations("DataConnectionForm");
  const tc = useTranslations("Common");
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

  // Controlled, so the worked example reflects what is typed rather than what
  // happens to be on the record. Only one provider's fields render at a time,
  // so S3 and GCS share the bucket.
  const [basePrefix, setBasePrefix] = useState<string>(
    (state.data.get("base_prefix") as string) || storedBasePrefix
  );
  const [bucket, setBucket] = useState<string>(
    (state.data.get("bucket") as string) ||
      (dataConnection && "bucket" in dataConnection.details
        ? dataConnection.details.bucket
        : "")
  );
  const [accountName, setAccountName] = useState<string>(
    (state.data.get("account_name") as string) ||
      (dataConnection?.details.provider === DataProvider.Azure
        ? dataConnection.details.account_name
        : "")
  );
  const [containerName, setContainerName] = useState<string>(
    (state.data.get("container_name") as string) ||
      (dataConnection?.details.provider === DataProvider.Azure
        ? dataConnection.details.container_name
        : "")
  );

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

  /** Where the backend itself starts, in the scheme that provider uses. */
  const backendRoot =
    provider === DataProvider.Azure
      ? `azure://${accountName || "<account>"}/${containerName || "<container>"}`
      : `${provider === DataProvider.GCS ? "gs" : "s3"}://${bucket || "<bucket>"}`;

  const resolvedLocation = exampleLocation(
    backendRoot,
    basePrefix,
    resolvedPrefixExample
  );

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
      {/* gap 6, not 4: this wrapper holds only whole sections, and they need to
          read as separate blocks rather than one continuous column of fields.
          Here rather than inside SectionHeader, which is also used as the sole
          child of a Card elsewhere. */}
      <Flex direction="column" gap="6">
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
        <SectionHeader title={t("sectionIdentity")}>
          <Flex direction="column" gap="4">
            <Field
              label={t("nameLabel")}
              help={t("nameHelp")}
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
            <Field
              label={t("idLabel")}
              help={
                mode === "edit"
                  ? t("idHelpEdit")
                  : derivedId
                    ? t("idHelpDerived")
                    : t("idHelpEmpty")
              }
              group
            >
              <Code size="2" variant="ghost" color="gray">
                {derivedId || "—"}
              </Code>
            </Field>

          </Flex>
        </SectionHeader>

        <SectionHeader title={t("sectionBackend")}>
          <Flex direction="column" gap="4">
            <Field
              label={t("providerLabel")}
              help={t("providerHelp")}
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
                              {t(option.descriptionKey)}
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
              <ConditionalGroup because={t("becauseProviderS3")}>
                <Field
                  label={t("bucketLabel")}
                  help={t("bucketHelpS3")}
                  errors={state.fieldErrors?.bucket}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="bucket"
                      value={bucket}
                      onChange={(event) => setBucket(event.target.value)}
                      size="3"
                    />
                  )}
                </Field>


                <Field
                  label={t("regionLabel")}
                  help={t("regionHelpS3")}
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
                        placeholder={t("regionPlaceholder")}
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
                  label={t("endpointLabel")}
                  help={t("endpointHelp")}
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
              <ConditionalGroup because={t("becauseProviderGcs")}>
                <Field
                  label={t("bucketLabel")}
                  help={t("bucketHelpGcs")}
                  errors={state.fieldErrors?.bucket}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="bucket"
                      value={bucket}
                      onChange={(event) => setBucket(event.target.value)}
                      size="3"
                    />
                  )}
                </Field>

              </ConditionalGroup>
            )}

            {provider === DataProvider.Azure && (
              <ConditionalGroup because={t("becauseProviderAzure")}>
                <Field
                  label={t("accountNameLabel")}
                  help={t("accountNameHelp")}
                  errors={state.fieldErrors?.account_name}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="account_name"
                      value={accountName}
                      onChange={(event) => setAccountName(event.target.value)}
                      size="3"
                    />
                  )}
                </Field>

                <Field
                  label={t("containerNameLabel")}
                  help={t("containerNameHelp")}
                  errors={state.fieldErrors?.container_name}
                >
                  {(props) => (
                    <TextField.Root
                      {...props}
                      type="text"
                      name="container_name"
                      value={containerName}
                      onChange={(event) => setContainerName(event.target.value)}
                      size="3"
                    />
                  )}
                </Field>


                <Field
                  label={t("regionLabel")}
                  help={t("regionHelpAzure")}
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
                        placeholder={t("regionPlaceholder")}
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

        <SectionHeader title={t("sectionAuthentication")}>
          <Flex direction="column" gap="4">
            <Field
              label={t("authTypeLabel")}
              help={
                <>
                  {t("authTypeHelp")}{" "}
                  {t(
                    (authType &&
                      AUTH_TYPE_DESCRIPTIONS[
                        authType as DataConnectionAuthenticationType
                      ]) ||
                      "authNoneDescription"
                  )}
                </>
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
                      <Select.Item value={NONE}>{t("authNone")}</Select.Item>
                      {authOptions.map((type) => (
                        <Select.Item key={type} value={type}>
                          {t(AUTH_TYPE_LABELS[type])}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </>
              )}
            </Field>

            {/* Auth-specific fields */}
            {authType === DataConnectionAuthenticationType.S3AccessKey && (
              <ConditionalGroup because={t("becauseMethodAccessKey")}>
                <Field
                  label={t("accessKeyIdLabel")}
                  help={t("accessKeyIdHelp")}
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
                  label={t("secretAccessKeyLabel")}
                  help={t("secretAccessKeyHelp")}
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
              <ConditionalGroup because={t("becauseMethodSasToken")}>
                <SecretField
                label={t("sasTokenLabel")}
                help={t("sasTokenHelp")}
                name="sas_token"
                stored={hasStoredSecret}
                required={mode === "create"}
                errors={state.fieldErrors?.sas_token}
                  defaultValue={(state.data.get("sas_token") as string) || ""}
                />
              </ConditionalGroup>
            )}

            {authType === DataConnectionAuthenticationType.S3WebIdentityRole && (
              <ConditionalGroup because={t("becauseMethodWebIdentityRole")}>
                <Field
                  label={t("roleArnLabel")}
                  help={t("roleArnHelp")}
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
                    label={t("trustSubjectLabel")}
                    help={t.rich("trustSubjectHelp", {
                      b: (chunks) => <Text weight="medium">{chunks}</Text>,
                    })}
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
              <ConditionalGroup because={t("becauseMethodWorkloadIdentity")}>
                <Field
                  label={t("tenantIdLabel")}
                  help={t("tenantIdHelp")}
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
                  label={t("clientIdLabel")}
                  help={t("clientIdHelp")}
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
              <ConditionalGroup because={t("becauseMethodWorkloadIdentity")}>
                <Field
                  label={t("workloadIdentityProviderLabel")}
                  help={t("workloadIdentityProviderHelp")}
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
                  label={t("serviceAccountLabel")}
                  help={t("serviceAccountHelp")}
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

        <SectionHeader title={t("sectionKeyLayout")}>
          <Flex direction="column" gap="4">
            <Field
              label={t("basePrefixLabel")}
              help={t("basePrefixHelp")}
              errors={state.fieldErrors?.base_prefix}
            >
              {(props) => (
                <TextField.Root
                  {...props}
                  type="text"
                  name="base_prefix"
                  value={basePrefix}
                  onChange={(event) => setBasePrefix(event.target.value)}
                  size="3"
                />
              )}
            </Field>

            <Field
              label={t("prefixTemplateLabel")}
              help={t("prefixTemplateHelp", {
                accountIdVar: "{{repository.account_id}}",
                repositoryIdVar: "{{repository.repository_id}}",
              })}
              errors={state.fieldErrors?.prefix_template}
            >
              {(props) => (
                <TextField.Root
                  {...props}
                  type="text"
                  name="prefix_template"
                  value={prefixTemplate}
                  onChange={(event) => setPrefixTemplate(event.target.value)}
                  size="3"
                />
              )}
            </Field>

            {/* A worked example, rather than describing the substitution in
                prose and leaving the reader to run it in their head. */}
            <Field
              group
              label={t("examplePrefixLabel")}
              help={t.rich("examplePrefixHelp", {
                path: "example-org/rainfall",
                code: (chunks) => (
                  <Code size="1" variant="ghost">
                    {chunks}
                  </Code>
                ),
              })}
            >
              <Box
                p="2"
                style={{
                  border: "1px solid var(--gray-6)",
                  backgroundColor: "var(--gray-2)",
                  borderRadius: "var(--radius-2)",
                  overflowX: "auto",
                  fontSize: "var(--font-size-1)",
                }}
                asChild
              >
                <pre>{resolvedLocation}</pre>
              </Box>
            </Field>

          </Flex>
        </SectionHeader>

        <SectionHeader title={t("sectionPolicy")}>
          <Flex direction="column" gap="4">
            <Field
              label={t("readOnlyLabel")}
              htmlFor="read-only-switch"
              help={t("readOnlyHelp")}
              errors={state.fieldErrors?.read_only}
              aside={
                <Switch
                  id="read-only-switch"
                  name="read_only"
                  size="2"
                  checked={readOnly}
                  onCheckedChange={(checked) => setReadOnly(checked === true)}
                  // The label row aligns on the text baseline, which a switch
                  // does not have.
                  style={{ alignSelf: "center" }}
                />
              }
            />

            <Field
              label={t("allowedVisibilitiesLabel")}
              help={t("allowedVisibilitiesHelp")}
              errors={state.fieldErrors?.allowed_visibilities}
              group
            >
              <>
                {/* CheckboxCards is not a form control, so each selection posts
                    through a hidden input — the same `visibility_<name>=on` the
                    checkboxes sent. */}
                {Object.values(ProductVisibility)
                  .filter((visibility) => visibilities.has(visibility))
                  .map((visibility) => (
                    <input
                      key={visibility}
                      type="hidden"
                      name={`visibility_${visibility}`}
                      value="on"
                    />
                  ))}
                <CheckboxCards.Root
                  size="1"
                  columns={{ initial: "1", sm: "3" }}
                  value={[...visibilities]}
                  onValueChange={(next) => setVisibilities(new Set(next))}
                >
                  {Object.values(ProductVisibility).map((visibility) => (
                    <CheckboxCards.Item
                      key={visibility}
                      value={visibility}
                      // Radix centres item content on both axes; the
                      // descriptions differ in length, so anchor to the start.
                      style={{
                        alignItems: "flex-start",
                        justifyContent: "flex-start",
                      }}
                    >
                      <Flex direction="column" align="start" gap="1">
                        <Text size="2" weight="medium">
                          {t(`visibility.${visibility}`)}
                        </Text>
                        {/* Phrased from the connection's side: which products
                            it will carry. */}
                        <Text size="1" color="gray">
                          {t(`visibilityDescription.${visibility}`)}
                        </Text>
                      </Flex>
                    </CheckboxCards.Item>
                  ))}
                </CheckboxCards.Root>
              </>
            </Field>

            {/* Required Flag is a platform-only gate; hidden on owned connections. */}
            {!ownerAccountId && (
              <Field
                label={t("requiredFlagLabel")}
                help={t("requiredFlagHelp")}
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
                        <Select.Item value={NONE}>{tc("none")}</Select.Item>
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
          submitLabel={mode === "create" ? tc("create") : tc("save")}
          pending={pending}
          message={state?.message}
          success={state.success}
        />
      </Flex>
    </form>
  );
}
