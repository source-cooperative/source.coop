"use server";

import { LOGGER } from "@/lib/logging";
import { isAdmin } from "../api/authz";
import { getPageSession } from "../api/utils";
import { productsTable, dataConnectionsTable } from "../clients";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import { editProductDataConnectionsUrl } from "@/lib/urls";

export async function addProductMirror(
  initialState: any,
  formData: FormData
): Promise<FormState<any>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return { fieldErrors: {}, data: formData, message: "Unauthenticated", success: false };
  }

  if (!isAdmin(session)) {
    return { fieldErrors: {}, data: formData, message: "Only admins can manage product mirrors", success: false };
  }

  const accountId = formData.get("account_id") as string;
  const productId = formData.get("product_id") as string;
  const connectionId = formData.get("connection_id") as string;

  if (!accountId || !productId || !connectionId) {
    return { fieldErrors: {}, data: formData, message: "Missing required fields", success: false };
  }

  try {
    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return { fieldErrors: {}, data: formData, message: "Product not found", success: false };
    }

    const connection = await dataConnectionsTable.fetchById(connectionId);
    if (!connection) {
      return { fieldErrors: {}, data: formData, message: "Data connection not found", success: false };
    }

    if (product.metadata.mirrors[connectionId]) {
      return { fieldErrors: {}, data: formData, message: "This data connection is already associated with this product", success: false };
    }

    const prefix = connection.prefix_template
      ? connection.prefix_template
          .replace("{account_id}", accountId)
          .replace("{repository_id}", productId)
      : `${accountId}/${productId}/`;

    const config: Record<string, string> = {};
    if (connection.details.provider === "s3") {
      config.region = connection.details.region;
      config.bucket = connection.details.bucket;
    } else {
      config.region = connection.details.region;
      config.container = connection.details.container_name;
    }

    const isFirst = Object.keys(product.metadata.mirrors).length === 0;

    const mirror = {
      storage_type: connection.details.provider === "s3" ? "s3" as const : "azure" as const,
      connection_id: connectionId,
      prefix,
      config,
      is_primary: isFirst,
    };

    const updatedMirrors = { ...product.metadata.mirrors, [connectionId]: mirror };

    const updatedProduct = {
      ...product,
      metadata: {
        ...product.metadata,
        mirrors: updatedMirrors,
        primary_mirror: isFirst ? connectionId : product.metadata.primary_mirror,
      },
    };

    await productsTable.update(updatedProduct);

    LOGGER.info("Successfully added product mirror", {
      operation: "addProductMirror",
      metadata: { accountId, productId, connectionId },
    });

    revalidatePath(editProductDataConnectionsUrl(accountId, productId));

    return { fieldErrors: {}, data: formData, message: "Data connection added successfully!", success: true };
  } catch (error) {
    LOGGER.error("Error adding product mirror", { operation: "addProductMirror", error });
    return { fieldErrors: {}, data: formData, message: "Failed to add data connection. Please try again.", success: false };
  }
}

export async function removeProductMirror(
  initialState: any,
  formData: FormData
): Promise<FormState<any>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return { fieldErrors: {}, data: formData, message: "Unauthenticated", success: false };
  }

  if (!isAdmin(session)) {
    return { fieldErrors: {}, data: formData, message: "Only admins can manage product mirrors", success: false };
  }

  const accountId = formData.get("account_id") as string;
  const productId = formData.get("product_id") as string;
  const mirrorKey = formData.get("mirror_key") as string;

  if (!accountId || !productId || !mirrorKey) {
    return { fieldErrors: {}, data: formData, message: "Missing required fields", success: false };
  }

  try {
    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return { fieldErrors: {}, data: formData, message: "Product not found", success: false };
    }

    if (!product.metadata.mirrors[mirrorKey]) {
      return { fieldErrors: {}, data: formData, message: "Mirror not found", success: false };
    }

    const { [mirrorKey]: removed, ...remainingMirrors } = product.metadata.mirrors;

    let primaryMirror = product.metadata.primary_mirror;
    if (primaryMirror === mirrorKey) {
      const remainingKeys = Object.keys(remainingMirrors);
      primaryMirror = remainingKeys.length > 0 ? remainingKeys[0] : "";
      if (primaryMirror && remainingMirrors[primaryMirror]) {
        remainingMirrors[primaryMirror] = { ...remainingMirrors[primaryMirror], is_primary: true };
      }
    }

    const updatedProduct = {
      ...product,
      metadata: { ...product.metadata, mirrors: remainingMirrors, primary_mirror: primaryMirror },
    };

    await productsTable.update(updatedProduct);

    LOGGER.info("Successfully removed product mirror", {
      operation: "removeProductMirror",
      metadata: { accountId, productId, mirrorKey },
    });

    revalidatePath(editProductDataConnectionsUrl(accountId, productId));

    return { fieldErrors: {}, data: formData, message: "Data connection removed successfully!", success: true };
  } catch (error) {
    LOGGER.error("Error removing product mirror", { operation: "removeProductMirror", error });
    return { fieldErrors: {}, data: formData, message: "Failed to remove data connection. Please try again.", success: false };
  }
}

export async function setPrimaryMirror(
  initialState: any,
  formData: FormData
): Promise<FormState<any>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return { fieldErrors: {}, data: formData, message: "Unauthenticated", success: false };
  }

  if (!isAdmin(session)) {
    return { fieldErrors: {}, data: formData, message: "Only admins can manage product mirrors", success: false };
  }

  const accountId = formData.get("account_id") as string;
  const productId = formData.get("product_id") as string;
  const mirrorKey = formData.get("mirror_key") as string;

  if (!accountId || !productId || !mirrorKey) {
    return { fieldErrors: {}, data: formData, message: "Missing required fields", success: false };
  }

  try {
    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return { fieldErrors: {}, data: formData, message: "Product not found", success: false };
    }

    if (!product.metadata.mirrors[mirrorKey]) {
      return { fieldErrors: {}, data: formData, message: "Mirror not found", success: false };
    }

    const updatedMirrors = { ...product.metadata.mirrors };
    for (const key of Object.keys(updatedMirrors)) {
      updatedMirrors[key] = { ...updatedMirrors[key], is_primary: key === mirrorKey };
    }

    const updatedProduct = {
      ...product,
      metadata: { ...product.metadata, mirrors: updatedMirrors, primary_mirror: mirrorKey },
    };

    await productsTable.update(updatedProduct);

    LOGGER.info("Successfully set primary mirror", {
      operation: "setPrimaryMirror",
      metadata: { accountId, productId, mirrorKey },
    });

    revalidatePath(editProductDataConnectionsUrl(accountId, productId));

    return { fieldErrors: {}, data: formData, message: "Primary mirror updated successfully!", success: true };
  } catch (error) {
    LOGGER.error("Error setting primary mirror", { operation: "setPrimaryMirror", error });
    return { fieldErrors: {}, data: formData, message: "Failed to update primary mirror. Please try again.", success: false };
  }
}
