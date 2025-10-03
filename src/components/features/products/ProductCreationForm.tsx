"use client";

import { useState } from "react";
import { Text, Spinner, Flex } from "@radix-ui/themes";
import { DynamicForm, FormField } from "@/components/core";
import { Account } from "@/types";
import { Product } from "@/types/product_v2";
import { useProductIdValidation } from "@/hooks/useIdValidation";
import { createProduct, updateProduct } from "@/lib/actions/products";

interface ProductCreationFormProps {
  potentialOwnerAccounts: Account[];
  product?: Product; // Optional product for edit mode
  mode?: "create" | "edit"; // Mode of operation
}

export function ProductCreationForm({
  potentialOwnerAccounts,
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
            onValueChange: setAccountId,
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
    {
      label: "Visibility",
      name: "visibility",
      type: "select",
      description: "Your product's visibility",
      options: [
        { value: "public", label: "Public" },
        { value: "unlisted", label: "Unlisted" },
        { value: "restricted", label: "Restricted" },
      ],
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
