"use client";

import { useState } from "react";
import { Text, Spinner, Flex } from "@radix-ui/themes";
import { DynamicForm, FormField } from "@/components/core";
import { Account, DataConnection } from "@/types";
import { Product, ProductVisibility } from "@/types/product";
import { useProductIdValidation } from "@/hooks/useIdValidation";
import { createProduct, updateProduct } from "@/lib/actions/products";
import { useFormatter, useTranslations } from "next-intl";

type Translator = ReturnType<typeof useTranslations<"ProductCreationForm">>;
type Formatter = ReturnType<typeof useFormatter>;

const VISIBILITY_KEYS = {
  [ProductVisibility.Public]: "public",
  [ProductVisibility.Unlisted]: "unlisted",
  [ProductVisibility.Restricted]: "restricted",
} as const satisfies Record<ProductVisibility, string>;

// Fallback when no data connection is selected (e.g. legacy products in edit
// mode whose connection can no longer be resolved).
const ALL_VISIBILITIES: ProductVisibility[] = [
  ProductVisibility.Public,
  ProductVisibility.Unlisted,
  ProductVisibility.Restricted,
];

function allowedVisibilitiesFor(
  connection: DataConnection | undefined
): ProductVisibility[] {
  // A connection that resolves but permits nothing is not the same as one that
  // could not be resolved. The `?.length` check used to conflate them, so a
  // connection with an empty allowed_visibilities offered all three options
  // while createProduct/updateProduct rejected every one of them — the form
  // promised a choice the server always refused.
  return connection ? connection.allowed_visibilities : ALL_VISIBILITIES;
}

// Region is only present on S3/Azure connections, not GCP (keyless WIF).
function regionOf(connection: DataConnection): string | undefined {
  return "region" in connection.details ? connection.details.region : undefined;
}

// A new product defaults to a us-west-2 connection when one is available — the
// region we steer unsure users toward — and otherwise to the first option.
// Read-only connections are never defaulted to: they can back a product, but it
// would have no upload controls, which is not a choice to make on the user's
// behalf.
const DEFAULT_REGION = "us-west-2";
function pickDefaultConnection(
  connections: DataConnection[]
): DataConnection | undefined {
  const writable = connections.filter((c) => !c.read_only);
  const preferred = writable.length ? writable : connections;
  return (
    preferred.find((c) => regionOf(c) === DEFAULT_REGION) ?? preferred[0]
  );
}

// "AWS Open Data (us-west-2) · Public, Unlisted · Read Only"
function describeConnection(
  connection: DataConnection,
  t: Translator,
  format: Formatter
): string {
  const visibilities =
    format.list(
      connection.allowed_visibilities.map((v) =>
        t(`visibility.${VISIBILITY_KEYS[v]}.label`)
      ),
      // Narrow conjunction is the bare comma list ("Public, Unlisted") in English.
      { type: "conjunction", style: "narrow" }
    ) || t("noVisibilities");
  const region = regionOf(connection);
  const location = region ? ` (${region})` : "";
  return t(connection.read_only ? "connectionOptionReadOnly" : "connectionOption", {
    name: connection.name,
    location,
    visibilities,
  });
}

interface ProductCreationFormProps {
  potentialOwnerAccounts: Account[];
  dataConnections?: DataConnection[]; // Connections the user may create against
  product?: Product; // Optional product for edit mode
  mode?: "create" | "edit"; // Mode of operation
  defaultOwnerId?: string; // Preselected owner (e.g. from ?owner=…), create mode
}

export function ProductCreationForm({
  potentialOwnerAccounts,
  dataConnections = [],
  product,
  mode = "create",
  defaultOwnerId,
}: ProductCreationFormProps) {
  const isEditMode = mode === "edit" && product;
  const t = useTranslations("ProductCreationForm");
  const tCommon = useTranslations("Common");
  const format = useFormatter();

  // In create mode, start on the preselected owner when given, else the first.
  const initialOwnerId = isEditMode
    ? product.account_id
    : (defaultOwnerId ?? potentialOwnerAccounts[0]?.account_id);

  const [accountId, setAccountId] = useState(initialOwnerId);
  const [productId, setProductId] = useState(
    isEditMode ? product.product_id : ""
  );
  const validationState = useProductIdValidation(productId, accountId);

  // Connections available to the currently selected owner account: either
  // unowned (Source-Coop-managed) or explicitly owned by that account. A
  // connection permitting no visibilities is excluded: createProduct rejects
  // every visibility against it, so offering it would only produce a dead end.
  // Edit mode is unaffected — the product's existing connection is passed in
  // separately and stays resolvable whatever it permits.
  const connectionsForAccount = (forAccountId: string) =>
    dataConnections.filter(
      (dc) =>
        (!dc.owner || dc.owner === forAccountId) &&
        dc.allowed_visibilities.length > 0
    );

  // Data connection selection. In edit mode the storage backend is fixed once
  // the product exists, so we don't offer a selector — but we still resolve the
  // product's connection to constrain the visibility options.
  const initialAvailable = connectionsForAccount(initialOwnerId ?? "");

  const [dataConnectionId, setDataConnectionId] = useState(
    isEditMode
      ? product.metadata.primary_mirror
      : pickDefaultConnection(initialAvailable)?.data_connection_id ?? ""
  );

  const [availableConnections, setAvailableConnections] = useState(
    isEditMode ? dataConnections : initialAvailable
  );

  const selectedConnection = availableConnections.find(
    (connection) => connection.data_connection_id === dataConnectionId
  );

  // In edit mode the connection is fixed and resolved server-side; if it can no
  // longer be found (e.g. deleted), updateProduct rejects any visibility change,
  // so the form shows visibility as read-only rather than offering options that
  // can't be saved.
  const connectionMissing = Boolean(isEditMode && !selectedConnection);

  const allowedVisibilities = allowedVisibilitiesFor(selectedConnection);

  const [visibility, setVisibility] = useState<ProductVisibility>(
    isEditMode ? product.visibility : allowedVisibilities[0]
  );

  // Active/deactivated toggle (edit mode only — new products start active).
  const [disabled, setDisabled] = useState<boolean>(
    isEditMode ? product.disabled : false
  );

  // When the connection changes, drop a now-disallowed visibility back to a
  // permitted one so the form can't submit an invalid combination.
  const handleConnectionChange = (value: string) => {
    setDataConnectionId(value);
    const next = availableConnections.find(
      (connection) => connection.data_connection_id === value
    );
    const nextAllowed = allowedVisibilitiesFor(next);
    if (!nextAllowed.includes(visibility)) {
      setVisibility(nextAllowed[0]);
    }
  };

  // When the owner account changes, recalculate which connections are available
  // and reset the selected connection/visibility if the current choice is no
  // longer valid for the new account.
  const handleAccountChange = (value: string) => {
    setAccountId(value);
    const nextAvailable = connectionsForAccount(value);
    setAvailableConnections(nextAvailable);
    const stillValid = nextAvailable.find(
      (dc) => dc.data_connection_id === dataConnectionId
    );
    if (!stillValid) {
      const first = pickDefaultConnection(nextAvailable);
      setDataConnectionId(first?.data_connection_id ?? "");
      const nextAllowed = allowedVisibilitiesFor(first);
      if (!nextAllowed.includes(visibility)) {
        setVisibility(nextAllowed[0]);
      }
    }
  };

  const fields: FormField<Product>[] = [
    {
      label: t("titleLabel"),
      name: "title",
      type: "text",
      required: true,
      section: t("sectionDescription"),
      description: t("titleDescription"),
      placeholder: t("titlePlaceholder"),
    },
    // Only show account selection and product ID validation in create mode
    ...(isEditMode
      ? []
      : ([
          {
            label: t("ownerLabel"),
            name: "account_id",
            type: "select",
            required: true,
            section: t("sectionDescription"),
            description: t("ownerDescription"),
            options: potentialOwnerAccounts.map((account) => ({
              value: account.account_id,
              label: account.name,
            })),
            controlled: true,
            value: accountId,
            onValueChange: handleAccountChange,
          },
          {
            label: t("productIdLabel"),
            name: "product_id",
            type: "text",
            required: true,
            section: t("sectionDescription"),
            mono: true,
            description: t("productIdDescription"),
            placeholder: t("productIdPlaceholder"),
            controlled: true,
            value: productId,
            onValueChange: setProductId,
            isValid: !!validationState.isValid,
            message: validationState.isLoading ? (
              <Flex align="center" gap="1">
                <Spinner size="1" />
                <Text size="1" color="gray">
                  {t.rich("checkingAvailability", {
                    id: `${accountId}/${productId}`,
                    code: (chunks) => <code>{chunks}</code>,
                  })}
                </Text>
              </Flex>
            ) : validationState.isValid === true ? (
              <Text size="1" color="green">
                {t.rich("available", {
                  id: `${accountId}/${productId}`,
                  code: (chunks) => <code>{chunks}</code>,
                })}
              </Text>
            ) : validationState.isValid === false && validationState.error ? (
              <Text size="1" color="red">
                ❌ {validationState.error}
              </Text>
            ) : null,
          },
        ] as FormField<Product>[])),
    {
      label: t("descriptionLabel"),
      name: "description",
      type: "textarea",
      required: false,
      section: t("sectionDescription"),
      description: t("descriptionDescription"),
      placeholder: t("descriptionPlaceholder"),
    },
    // Data connection selector (create mode only). Drives the region and the
    // visibility options available below.
    ...(isEditMode
      ? []
      : ([
          {
            label: t("connectionLabel"),
            name: "data_connection_id" as keyof Product,
            type: "select",
            required: true,
            section: t("sectionStorage"),
            description: t("connectionDescription"),
            options: [...availableConnections]
              .sort(
                (a, b) =>
                  a.details.provider.localeCompare(b.details.provider) ||
                  a.name.localeCompare(b.name)
              )
              .map((connection) => ({
                value: connection.data_connection_id,
                label: describeConnection(connection, t, format),
              })),
            placeholder:
              availableConnections.length === 0
                ? t("noConnections")
                : undefined,
            readOnly: availableConnections.length === 0,
            controlled: true,
            value: dataConnectionId,
            onValueChange: handleConnectionChange,
          },
        ] as FormField<Product>[])),
    {
      label: t("visibilityLabel"),
      name: "visibility",
      type: "radio-cards",
      required: true,
      section: t("sectionAccess"),
      description: connectionMissing
        ? t("visibilityConnectionMissing")
        : t("visibilityDescription"),
      // Every visibility is listed; the connection decides which are selectable.
      options: ALL_VISIBILITIES.map((value) => {
        const permitted = allowedVisibilities.includes(value);
        return {
          value,
          label: t(`visibility.${VISIBILITY_KEYS[value]}.label`),
          description: t(`visibility.${VISIBILITY_KEYS[value]}.description`),
          // The current value stays selectable even when the connection no
          // longer permits it (legacy drift), so an edit of some other field
          // isn't blocked by a visibility the user didn't choose today.
          // The greyed-out card carries "unavailable" by itself, and the help
          // text above already says the options follow the data connection.
          disabled: !permitted && value !== visibility,
        };
      }),
      readOnly: connectionMissing,
      controlled: true,
      value: visibility,
      onValueChange: (value) => setVisibility(value as ProductVisibility),
    },
    // Activation toggle (edit mode only). Deactivating hides the product
    // everywhere; only an admin can reactivate it afterwards.
    ...(isEditMode
      ? ([
          {
            label: t("statusLabel"),
            name: "disabled" as keyof Product,
            type: "switch",
            section: t("sectionAccess"),
            switchLabel: disabled ? t("statusDeactivated") : t("statusActive"),
            invert: true,
            dangerWhenOff: true,
            description: t("statusDescription"),
            controlled: true,
            value: String(disabled),
            onValueChange: (value) => setDisabled(value === "true"),
          },
        ] as FormField<Product>[])
      : []),
  ];

  return (
    <DynamicForm
      fields={fields}
      action={isEditMode ? updateProduct : createProduct}
      submitButtonText={isEditMode ? tCommon("save") : tCommon("create")}
      hiddenFields={
        isEditMode
          ? {
              account_id: product.account_id,
              product_id: product.product_id,
            }
          : {}
      }
      initialValues={
        isEditMode
          ? {
              title: product.title,
              description: product.description,
              visibility: product.visibility,
            }
          : undefined
      }
    />
  );
}
