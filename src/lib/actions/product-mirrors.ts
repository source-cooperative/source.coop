"use server";

import { getPageSession } from "../api/utils";
import { FormState } from "@/components/core/DynamicForm";
import * as ops from "@/lib/operations/mirrors";
import { toFormState } from "@/lib/operations/result";

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

export async function addProductMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const { account_id, product_id, field } = fields(formData);
  const result = await ops.addMirror(
    await getPageSession(),
    account_id,
    product_id,
    { connection_id: field("connection_id") }
  );
  return toFormState(result, formData, "Data connection added successfully!");
}

export async function removeProductMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const { account_id, product_id, mirror_key } = fields(formData);
  const result = await ops.removeMirror(
    await getPageSession(),
    account_id,
    product_id,
    mirror_key
  );
  return toFormState(result, formData, "Data connection removed successfully!");
}

export async function updateMirrorPrefix(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const { account_id, product_id, mirror_key, field } = fields(formData);
  const result = await ops.updateMirror(
    await getPageSession(),
    account_id,
    product_id,
    mirror_key,
    { prefix: field("prefix") }
  );
  return toFormState(result, formData, "Prefix updated successfully!");
}

export async function setPrimaryMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const { account_id, product_id, mirror_key } = fields(formData);
  const result = await ops.updateMirror(
    await getPageSession(),
    account_id,
    product_id,
    mirror_key,
    { is_primary: true }
  );
  return toFormState(result, formData, "Primary mirror updated successfully!");
}
