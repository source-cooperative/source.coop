"use server";

import { LOGGER } from "@/lib/logging";
import { isAdmin } from "../api/authz";
import { getPageSession } from "../api/utils";
import { productsTable, dataConnectionsTable } from "../clients";
import { DataProvider, ProductMirror } from "@/types";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import { editProductDataConnectionsUrl } from "@/lib/urls";

// ponytail: these three actions fetch → mutate → productsTable.update() with no
// optimistic lock, so two admins editing the same product's mirrors at once can
// silently lose one update (last write wins). Admin-only and low-frequency, so
// the race is left open. Upgrade path: thread a ConditionExpression on
// updated_at through productsTable.update() for a compare-and-swap.

export async function addProductMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthenticated",
      success: false,
    };
  }

  if (!isAdmin(session)) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Only admins can manage product mirrors",
      success: false,
    };
  }

  const accountId = formData.get("account_id") as string;
  const productId = formData.get("product_id") as string;
  const connectionId = formData.get("connection_id") as string;

  if (!accountId || !productId || !connectionId) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Missing required fields",
      success: false,
    };
  }

  try {
    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Product not found",
        success: false,
      };
    }

    const connection = await dataConnectionsTable.fetchById(connectionId);
    if (!connection) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Data connection not found",
        success: false,
      };
    }

    if (product.metadata.mirrors[connectionId]) {
      return {
        fieldErrors: {},
        data: formData,
        message: "This data connection is already associated with this product",
        success: false,
      };
    }

    const prefix = connection.prefix_template
      ? connection.prefix_template
          .replaceAll("{{repository.account_id}}", accountId)
          .replaceAll("{{repository.repository_id}}", productId)
      : `${accountId}/${productId}/`;

    const isFirst = Object.keys(product.metadata.mirrors).length === 0;

    const storageTypeByProvider: Record<
      DataProvider,
      ProductMirror["storage_type"]
    > = {
      [DataProvider.S3]: "s3",
      [DataProvider.Azure]: "azure",
      [DataProvider.GCP]: "gcs",
    };

    const mirror: ProductMirror = {
      storage_type: storageTypeByProvider[connection.details.provider],
      connection_id: connectionId,
      prefix,
      is_primary: isFirst,
    };

    const updatedProduct = {
      ...product,
      metadata: {
        ...product.metadata,
        mirrors: { ...product.metadata.mirrors, [connectionId]: mirror },
        primary_mirror: isFirst ? connectionId : product.metadata.primary_mirror,
      },
    };

    await productsTable.update(updatedProduct);

    LOGGER.info("Successfully added product mirror", {
      operation: "addProductMirror",
      metadata: { accountId, productId, connectionId },
    });

    revalidatePath(editProductDataConnectionsUrl(accountId, productId));

    return {
      fieldErrors: {},
      data: formData,
      message: "Data connection added successfully!",
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error adding product mirror", {
      operation: "addProductMirror",
      error,
    });
    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to add data connection. Please try again.",
      success: false,
    };
  }
}

export async function removeProductMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthenticated",
      success: false,
    };
  }

  if (!isAdmin(session)) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Only admins can manage product mirrors",
      success: false,
    };
  }

  const accountId = formData.get("account_id") as string;
  const productId = formData.get("product_id") as string;
  const mirrorKey = formData.get("mirror_key") as string;

  if (!accountId || !productId || !mirrorKey) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Missing required fields",
      success: false,
    };
  }

  try {
    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Product not found",
        success: false,
      };
    }

    if (!product.metadata.mirrors[mirrorKey]) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Mirror not found",
        success: false,
      };
    }

    const remainingMirrors = { ...product.metadata.mirrors };
    delete remainingMirrors[mirrorKey];

    // If we removed the primary, promote the first remaining mirror (if any).
    let primaryMirror = product.metadata.primary_mirror;
    if (primaryMirror === mirrorKey) {
      const [nextPrimary] = Object.keys(remainingMirrors);
      primaryMirror = nextPrimary ?? "";
      if (nextPrimary) {
        remainingMirrors[nextPrimary] = {
          ...remainingMirrors[nextPrimary],
          is_primary: true,
        };
      }
    }

    const updatedProduct = {
      ...product,
      metadata: {
        ...product.metadata,
        mirrors: remainingMirrors,
        primary_mirror: primaryMirror,
      },
    };

    await productsTable.update(updatedProduct);

    LOGGER.info("Successfully removed product mirror", {
      operation: "removeProductMirror",
      metadata: { accountId, productId, mirrorKey },
    });

    revalidatePath(editProductDataConnectionsUrl(accountId, productId));

    return {
      fieldErrors: {},
      data: formData,
      message: "Data connection removed successfully!",
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error removing product mirror", {
      operation: "removeProductMirror",
      error,
    });
    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to remove data connection. Please try again.",
      success: false,
    };
  }
}

export async function setPrimaryMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthenticated",
      success: false,
    };
  }

  if (!isAdmin(session)) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Only admins can manage product mirrors",
      success: false,
    };
  }

  const accountId = formData.get("account_id") as string;
  const productId = formData.get("product_id") as string;
  const mirrorKey = formData.get("mirror_key") as string;

  if (!accountId || !productId || !mirrorKey) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Missing required fields",
      success: false,
    };
  }

  try {
    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Product not found",
        success: false,
      };
    }

    if (!product.metadata.mirrors[mirrorKey]) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Mirror not found",
        success: false,
      };
    }

    const updatedMirrors = { ...product.metadata.mirrors };
    for (const key of Object.keys(updatedMirrors)) {
      updatedMirrors[key] = {
        ...updatedMirrors[key],
        is_primary: key === mirrorKey,
      };
    }

    const updatedProduct = {
      ...product,
      metadata: {
        ...product.metadata,
        mirrors: updatedMirrors,
        primary_mirror: mirrorKey,
      },
    };

    await productsTable.update(updatedProduct);

    LOGGER.info("Successfully set primary mirror", {
      operation: "setPrimaryMirror",
      metadata: { accountId, productId, mirrorKey },
    });

    revalidatePath(editProductDataConnectionsUrl(accountId, productId));

    return {
      fieldErrors: {},
      data: formData,
      message: "Primary mirror updated successfully!",
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error setting primary mirror", {
      operation: "setPrimaryMirror",
      error,
    });
    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to update primary mirror. Please try again.",
      success: false,
    };
  }
}
