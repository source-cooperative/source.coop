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

// "AWS Open Data (us-west-2) · Public, Unlisted · Read Only"
function describeConnection(connection: DataConnection): string {
  const visibilities =
    connection.allowed_visibilities.map((v) => VISIBILITY_LABELS[v]).join(", ") ||
    "no visibilities";
  const readOnly = connection.read_only ? " · Read Only" : "";
  return `${connection.name} (${connection.details.region}) · ${visibilities}${readOnly}`;
}

interface ProductCreationFormProps {
  potentialOwnerAccounts: Account[];
  dataConnections?: DataConnection[]; // Connections the user may create against
  product?: Product; // Optional product for edit mode
  mode?: "create" | "edit"; // Mode of operation
}

export function ProductCreationForm({
  potentialOwnerAccounts,
  dataConnections = [],
  product,
  mode = "create",
}: ProductCreationFormProps) {
  const isEditMode = mode === "edit" && product;

  const [accountId, setAccountId] = useState(
    isEditMode ? product.account_id : potentialOwnerAccounts[0]?.account_id
  );
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
  const initialAccountId = isEditMode
    ? product.account_id
    : potentialOwnerAccounts[0]?.account_id;
  const initialAvailable = connectionsForAccount(initialAccountId ?? "");

  const [dataConnectionId, setDataConnectionId] = useState(
    isEditMode
      ? product.metadata.primary_mirror
      : initialAvailable[0]?.data_connection_id ?? ""
  );

  const [availableConnections, setAvailableConnections] = useState(
    isEditMode ? dataConnections : initialAvailable
  );

  const selectedConnection = availableConnections.find(
    (connection) => connection.data_connection_id === dataConnectionId
  );

  const allowedVisibilities = allowedVisibilitiesFor(selectedConnection);

  const [visibility, setVisibility] = useState<ProductVisibility>(
    isEditMode ? product.visibility : allowedVisibilities[0]
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
      const first = nextAvailable[0];
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
              "Where this product's data is stored. Determines the available region and visibility options.",
            options: availableConnections.map((connection) => ({
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
      description: "Your product's visibility",
      options: visibilityOptions.map((value) => ({
        value,
        label: VISIBILITY_LABELS[value],
      })),
      controlled: true,
      value: visibility,
      onValueChange: (value) => setVisibility(value as ProductVisibility),
    },
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
