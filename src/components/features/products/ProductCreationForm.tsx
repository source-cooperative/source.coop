"use client";

import { useState } from "react";
import { Text, Spinner, Flex } from "@radix-ui/themes";
import { DynamicForm, FormField } from "@/components/core";
import { Account, DataConnection } from "@/types";
import { Product, ProductVisibility } from "@/types/product";
import { useProductIdValidation } from "@/hooks/useIdValidation";
import { createProduct, updateProduct } from "@/lib/actions/products";

const VISIBILITY_LABELS: Record<ProductVisibility, string> = {
  [ProductVisibility.Public]: "Public",
  [ProductVisibility.Unlisted]: "Unlisted",
  [ProductVisibility.Restricted]: "Restricted",
};

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
  return connection?.allowed_visibilities?.length
    ? connection.allowed_visibilities
    : ALL_VISIBILITIES;
}

// Region is only present on S3/Azure connections, not GCP (keyless WIF).
function regionOf(connection: DataConnection): string | undefined {
  return "region" in connection.details ? connection.details.region : undefined;
}

// A new product defaults to a us-west-2 connection when one is available — the
// region we steer unsure users toward — and otherwise to the first option.
const DEFAULT_REGION = "us-west-2";
function pickDefaultConnection(
  connections: DataConnection[]
): DataConnection | undefined {
  return (
    connections.find((c) => regionOf(c) === DEFAULT_REGION) ?? connections[0]
  );
}

// "AWS Open Data (us-west-2) · Public, Unlisted · Read Only"
function describeConnection(connection: DataConnection): string {
  const visibilities =
    connection.allowed_visibilities.map((v) => VISIBILITY_LABELS[v]).join(", ") ||
    "no visibilities";
  const region = regionOf(connection);
  const location = region ? ` (${region})` : "";
  const readOnly = connection.read_only ? " · Read Only" : "";
  return `${connection.name}${location} · ${visibilities}${readOnly}`;
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
  // unowned (Source-Coop-managed) or explicitly owned by that account.
  const connectionsForAccount = (forAccountId: string) =>
    dataConnections.filter(
      (dc) => !dc.owner || dc.owner === forAccountId
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

  // The currently selected visibility must always be selectable, even if it
  // falls outside the connection's allowed set (e.g. legacy data drift).
  const visibilityOptions = allowedVisibilities.includes(visibility)
    ? allowedVisibilities
    : [visibility, ...allowedVisibilities];

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
      label: "Product Title",
      name: "title",
      type: "text",
      required: true,
      description: "The name of your product",
      placeholder: "Enter product name",
    },
    // Only show account selection and product ID validation in create mode
    ...(isEditMode
      ? []
      : ([
          {
            label: "Owner Account",
            name: "account_id",
            type: "select",
            required: true,
            description: "The account that owns the product",
            options: potentialOwnerAccounts.map((account) => ({
              value: account.account_id,
              label: account.name,
            })),
            controlled: true,
            value: accountId,
            onValueChange: handleAccountChange,
          },
          {
            label: "Product ID",
            name: "product_id",
            type: "text",
            required: true,
            description: "The ID of your product",
            placeholder: "Enter product ID",
            controlled: true,
            value: productId,
            onValueChange: setProductId,
            isValid: !!validationState.isValid,
            message: validationState.isLoading ? (
              <Flex align="center" gap="1">
                <Spinner size="1" />
                <Text size="1" color="gray">
                  Checking availability of{" "}
                  <code>{`${accountId}/${productId}`}</code>
                </Text>
              </Flex>
            ) : validationState.isValid === true ? (
              <Text size="1" color="green">
                ✓ Available: <code>{`${accountId}/${productId}`}</code>
              </Text>
            ) : validationState.isValid === false && validationState.error ? (
              <Text size="1" color="red">
                ❌ {validationState.error}
              </Text>
            ) : null,
          },
        ] as FormField<Product>[])),
    {
      label: "Description",
      name: "description",
      type: "textarea",
      required: false,
      description: "A brief description of your product",
      placeholder: "Describe your product",
    },
    // Data connection selector (create mode only). Drives the region and the
    // visibility options available below.
    ...(isEditMode
      ? []
      : ([
          {
            label: "Data Connection",
            name: "data_connection_id" as keyof Product,
            type: "select",
            required: true,
            description:
              "Where this product's data is stored. Determines the available region and visibility options. If you're unsure, choose a us-west-2 connection.",
            options: [...availableConnections]
              .sort(
                (a, b) =>
                  a.details.provider.localeCompare(b.details.provider) ||
                  a.name.localeCompare(b.name)
              )
              .map((connection) => ({
                value: connection.data_connection_id,
                label: describeConnection(connection),
              })),
            placeholder:
              availableConnections.length === 0
                ? "No data connections available"
                : undefined,
            readOnly: availableConnections.length === 0,
            controlled: true,
            value: dataConnectionId,
            onValueChange: handleConnectionChange,
          },
        ] as FormField<Product>[])),
    {
      label: "Visibility",
      name: "visibility",
      type: "select",
      required: true,
      description: connectionMissing
        ? "This product's data connection could not be found, so its visibility can't be changed."
        : "Your product's visibility. The available options depend on the product's primary data connection.",
      options: visibilityOptions.map((value) => ({
        value,
        label: VISIBILITY_LABELS[value],
      })),
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
            label: "Status",
            name: "disabled" as keyof Product,
            type: "select",
            required: true,
            description:
              "A deactivated product is inaccessible via the data.source.coop API and hidden from the source.coop UI for everyone except administrators. This does not delete the product's data — it only makes it unavailable. Reactivating it afterwards requires a Source Cooperative administrator.",
            options: [
              { value: "false", label: "Active" },
              { value: "true", label: "Deactivated" },
            ],
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
      submitButtonText={isEditMode ? "Update Product" : "Create Product"}
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
