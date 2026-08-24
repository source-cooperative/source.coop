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

const VISIBILITY_DESCRIPTIONS: Record<ProductVisibility, string> = {
  [ProductVisibility.Public]:
    "Anyone can find and download it. Appears in search and the product feed.",
  [ProductVisibility.Unlisted]:
    "Anyone with the link can download it. Hidden from search and the feed.",
  [ProductVisibility.Restricted]: "Members of this product only.",
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
      label: "Product Title",
      name: "title",
      type: "text",
      required: true,
      section: "Description",
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
            section: "Description",
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
            section: "Description",
            mono: true,
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
      section: "Description",
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
            section: "Storage",
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
      type: "radio-cards",
      required: true,
      section: "Access",
      description: connectionMissing
        ? "This product's data connection could not be found, so its visibility can't be changed."
        : "Who can reach this product. The options depend on its data connection.",
      // Every visibility is listed; the connection decides which are selectable.
      options: ALL_VISIBILITIES.map((value) => {
        const permitted = allowedVisibilities.includes(value);
        return {
          value,
          label: VISIBILITY_LABELS[value],
          description: VISIBILITY_DESCRIPTIONS[value],
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
            label: "Status",
            name: "disabled" as keyof Product,
            type: "switch",
            // Belongs with Visibility: both answer "who can reach this", and a
            // section holding one field repeated its own name as that field's
            // label.
            section: "Access",
            switchLabel: disabled ? "Deactivated" : "Active",
            invert: true,
            description:
              "Deactivating hides the product from source.coop and blocks the data.source.coop API. The data is kept, but only a Source Cooperative administrator can reactivate it.",
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
