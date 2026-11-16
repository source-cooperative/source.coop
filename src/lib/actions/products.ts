"use server";

import { hidePendingTags, productsTable } from "@/lib/clients/database";
import type { Product, ProductCreationRequest } from "@/types";
import { getPageSession, LOGGER } from "@/lib";
import { FormState } from "@/components/core/DynamicForm";
import { productUrl } from "@/lib/urls";
import * as ops from "@/lib/operations/products";
import { toFormState, type OperationResult } from "@/lib/operations/result";

export async function getFeaturedProducts(limit = 10): Promise<Product[]> {
  try {
    const result = await productsTable.listPublic(limit, undefined, {
      featuredOnly: true,
    });
    return hidePendingTags(await productsTable.attachAccounts(result.products));
  } catch (error) {
    LOGGER.error("Failed to fetch featured products", {
      operation: "getFeaturedProducts",
      context: "product fetching",
      error: error,
    });
    throw new Error("Failed to fetch featured products");
  }
}

// The picker submits one form value per tag, which Object.fromEntries would
// cut to the last: chosen tags under `tags`, new ones under `suggest_tags`.
const tagFields = (formData: FormData) => ({
  tags: formData.getAll("tags").map(String),
  suggest_tags: formData.getAll("suggest_tags").map(String),
});

/** A problem with a suggested tag, shown under the form's one Tags field. */
function onTagsField<T>(result: OperationResult<T>): OperationResult<T> {
  if (result.ok || !result.fieldErrors?.suggest_tags) return result;
  const { suggest_tags, ...rest } = result.fieldErrors;
  return { ...result, fieldErrors: { ...rest, tags: suggest_tags } };
}

export async function createProduct(
  initialState: any,
  formData: FormData,
): Promise<FormState<ProductCreationRequest>> {
  const result = onTagsField(
    await ops.createProduct(await getPageSession(), {
      ...Object.fromEntries(formData),
      ...tagFields(formData),
    }),
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
  try {
    const result = onTagsField(
      await ops.updateProduct(await getPageSession(), account_id, product_id, {
        title: field("title"),
        description: field("description"),
        visibility: field("visibility"),
        disabled: disabled === null ? undefined : disabled === "true",
        // Always sent: the picker submits nothing when every chip is
        // removed, and that has to clear the tags.
        ...tagFields(formData),
      }),
    );
    return toFormState(result, formData, "Product updated successfully!");
  } catch (error) {
    LOGGER.error("Error updating product", {
      operation: "updateProduct",
      context: "product update",
      error: error,
      metadata: { account_id, product_id },
    });
    return toFormState(
      { ok: false, error: "conflict", message: "Failed to update product. Please try again." },
      formData,
      "",
    );
  }
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
  return { success: true };
}
