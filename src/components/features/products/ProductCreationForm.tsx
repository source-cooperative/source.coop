"use client";

import { useState } from "react";
import { Box, Heading, Text, Spinner, Flex } from "@radix-ui/themes";
import { DynamicForm, FormField } from "@/components/core";
import { createAccount } from "@/lib/actions/account";
import { Account } from "@/types";
import { Product } from "@/types/product_v2";
import { useProductIdValidation } from "@/hooks/useIdValidation";
import { createProduct } from "@/lib/actions/products";

interface ProductCreationFormProps {
  potentialOwnerAccounts: Account[];
}

export function ProductCreationForm({
  potentialOwnerAccounts,
}: ProductCreationFormProps) {
  const [accountId, setAccountId] = useState(
    potentialOwnerAccounts[0]?.account_id
  );
  const [productId, setProductId] = useState("");
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
            Checking availability of <code>{`${accountId}/${productId}`}</code>
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
    <>
      <Box mb="4">
        <Heading size="8" mb="1">
          Create New Product
        </Heading>

        <Text size="2" color="gray">
          Create a new product to share with others
        </Text>
      </Box>

      <DynamicForm
        fields={fields}
        action={createProduct}
        submitButtonText="Create Product"
        hiddenFields={{}}
      />
    </>
  );
}
