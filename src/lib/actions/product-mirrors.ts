"use server";

import { getPageSession } from "../api/utils";
import { LOGGER } from "@/lib/logging";
import { FormState } from "@/components/core/DynamicForm";
import * as ops from "@/lib/operations/mirrors";
import { OperationResult, toFormState } from "@/lib/operations/result";

/** The fields every mirror form carries; an absent one reads as "". */
const fields = (formData: FormData) => {
  const field = (name: string) => String(formData.get(name) ?? "");
  return {
    account_id: field("account_id"),
    product_id: field("product_id"),
    mirror_key: field("mirror_key"),
    field,
  };
};

/**
 * The operation's result as form state. A failure it throws becomes a message
 * on the row rather than an error page in place of every mirror.
 */
async function run(
  formData: FormData,
  successMessage: string,
  operation: () => Promise<OperationResult<unknown>>
): Promise<FormState<unknown>> {
  try {
    return toFormState(await operation(), formData, successMessage);
  } catch (error) {
    const { account_id, product_id, mirror_key } = fields(formData);
    LOGGER.error("Error changing product mirrors", {
      operation: "product-mirrors",
      error,
      metadata: { account_id, product_id, mirror_key },
    });
    return toFormState(
      { ok: false, error: "conflict", message: "Failed to save. Please try again." },
      formData,
      ""
    );
  }
}

export async function addProductMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const { account_id, product_id, field } = fields(formData);
  return run(formData, "Data connection added successfully!", async () =>
    ops.addMirror(await getPageSession(), account_id, product_id, {
      connection_id: field("connection_id"),
    })
  );
}

export async function removeProductMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const { account_id, product_id, mirror_key } = fields(formData);
  return run(formData, "Data connection removed successfully!", async () =>
    ops.removeMirror(await getPageSession(), account_id, product_id, mirror_key)
  );
}

export async function updateMirrorPrefix(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const { account_id, product_id, mirror_key, field } = fields(formData);
  return run(formData, "Prefix updated successfully!", async () =>
    ops.updateMirror(await getPageSession(), account_id, product_id, mirror_key, {
      prefix: field("prefix"),
    })
  );
}

export async function setPrimaryMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const { account_id, product_id, mirror_key } = fields(formData);
  return run(formData, "Primary mirror updated successfully!", async () =>
    ops.updateMirror(await getPageSession(), account_id, product_id, mirror_key, {
      is_primary: true,
    })
  );
}
