"use server";

import { productsTable } from "@/lib/clients/database";
import type { Product, ProductCreationRequest } from "@/types";
import { getPageSession, LOGGER } from "@/lib";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import { productUrl, editProductDetailsUrl, accountUrl } from "@/lib/urls";
import * as ops from "@/lib/operations/products";
import { toFormState } from "@/lib/operations/result";

export async function getFeaturedProducts(limit = 10): Promise<Product[]> {
  try {
    const result = await productsTable.listPublic(limit, undefined, {
      featuredOnly: true,
    });
    return productsTable.attachAccounts(result.products);
  } catch (error) {
    LOGGER.error("Failed to fetch featured products", {
      operation: "getFeaturedProducts",
      context: "product fetching",
      error: error,
    });
    throw new Error("Failed to fetch featured products");
  }
}

export async function createProduct(
  initialState: any,
  formData: FormData,
): Promise<FormState<ProductCreationRequest>> {
  const result = await ops.createProduct(
    await getPageSession(),
    Object.fromEntries(formData),
  );
  // Navigate on the client (see FormState.redirectTo) rather than redirect()
  // here, so the shared layout's auth UI re-renders with the current session.
  return toFormState(
    result,
    formData,
    "",
    result.ok
      ? productUrl(result.value.account_id, result.value.product_id, "success")
      : undefined,
  );
}

export async function updateProduct(
  initialState: any,
  formData: FormData,
): Promise<FormState<Partial<Product>>> {
  const account_id = String(formData.get("account_id") ?? "");
  const product_id = String(formData.get("product_id") ?? "");
  // An empty field leaves the product's value as it is; so does an absent
  // activation toggle, which otherwise submits "true" or "false".
  const field = (name: string) => formData.get(name) || undefined;
  const disabled = formData.get("disabled");
  const result = await ops.updateProduct(
    await getPageSession(),
    account_id,
    product_id,
    {
      title: field("title"),
      description: field("description"),
      visibility: field("visibility"),
      disabled: disabled === null ? undefined : disabled === "true",
    },
  );
  if (result.ok) {
    revalidatePath(productUrl(account_id, product_id));
    revalidatePath(editProductDetailsUrl(account_id, product_id));
  }
  return toFormState(result, formData, "Product updated successfully!");
}

export async function deleteProduct(
  account_id: string,
  product_id: string,
  preserveData: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await ops.deleteProduct(
      await getPageSession(),
      account_id,
      product_id,
      { preserve_data: String(preserveData) },
    );
    if (!result.ok) return { success: false, error: result.message };
  } catch (error) {
    LOGGER.error("Error deleting product", {
      operation: "deleteProduct",
      context: "product deletion",
      error: error,
      metadata: { account_id, product_id },
    });
    // Most failures here (e.g. S3 "Access Denied") aren't transient, so the
    // cause is worth more to the user than "try again".
    const reason = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to delete product: ${reason}` };
  }
  // Other users stop seeing the product, and its account stops listing it.
  revalidatePath(productUrl(account_id, product_id));
  revalidatePath(editProductDetailsUrl(account_id, product_id));
  revalidatePath(accountUrl(account_id));
  return { success: true };
}
