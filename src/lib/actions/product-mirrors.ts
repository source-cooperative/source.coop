"use server";

import { LOGGER } from "@/lib/logging";
import { isAdmin, isAuthorized } from "../api/authz";
import { getPageSession } from "../api/utils";
import { productsTable, dataConnectionsTable } from "../clients";
import {
  Actions,
  DataProvider,
  ProductMirror,
  resolveMirrorPrefix,
} from "@/types";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import { editProductDataConnectionsUrl } from "@/lib/urls";
import { canManageDataConnection } from "@/lib/data-connections";

// These three actions fetch → mutate → productsTable.update(). The update is an
// optimistic compare-and-swap on the product's updated_at, so two admins editing
// the same product's mirrors concurrently can't silently clobber each other —
// the second write fails and the action reports a conflict instead.
const CONCURRENT_EDIT_MESSAGE =
  "This product was modified by someone else. Please reload and try again.";

function isConcurrentEdit(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "ConditionalCheckFailedException"
  );
}

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

    const prefix = resolveMirrorPrefix(
      connection.prefix_template,
      accountId,
      productId
    );

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

    await productsTable.update(updatedProduct, {
      expectedUpdatedAt: product.updated_at,
    });

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
    if (isConcurrentEdit(error)) {
      return {
        fieldErrors: {},
        data: formData,
        message: CONCURRENT_EDIT_MESSAGE,
        success: false,
      };
    }
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

    await productsTable.update(updatedProduct, {
      expectedUpdatedAt: product.updated_at,
    });

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
    if (isConcurrentEdit(error)) {
      return {
        fieldErrors: {},
        data: formData,
        message: CONCURRENT_EDIT_MESSAGE,
        success: false,
      };
    }
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

// Unlike the admin-only actions above, editing a mirror's prefix is open to
// non-admins — but requires the *intersection* of managing the product AND the
// data connection: the caller must be an owner/maintainer of the product
// (PutRepository) AND able to manage the underlying connection
// (canManageDataConnection). Admins satisfy both.
export async function updateMirrorPrefix(
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

  const accountId = formData.get("account_id") as string;
  const productId = formData.get("product_id") as string;
  const mirrorKey = formData.get("mirror_key") as string;
  const rawPrefix = ((formData.get("prefix") as string) || "").trim();

  if (!accountId || !productId || !mirrorKey) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Missing required fields",
      success: false,
    };
  }

  // This is the only path where prefix is free-form user input (elsewhere it's
  // machine-generated by resolveMirrorPrefix). Keys are built by literal
  // concatenation (`${prefix}${key}`), so reject traversal/leading-slash and
  // force a trailing separator — without it "acct/prod" also matches keys under
  // "acct/prod2/" on a shared connection.
  // ponytail: no cross-product collision scan; managing the connection already
  // grants broad access. Add a scan if prefix overlap becomes a real problem.
  if (rawPrefix.includes("..") || rawPrefix.startsWith("/")) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Prefix can't start with '/' or contain '..'",
      success: false,
    };
  }
  const prefix =
    !rawPrefix || rawPrefix.endsWith("/") ? rawPrefix : `${rawPrefix}/`;

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

    if (!isAuthorized(session, product, Actions.PutRepository)) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Only product owners or maintainers can edit mirror prefixes",
        success: false,
      };
    }

    const existing = product.metadata.mirrors[mirrorKey];
    if (!existing) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Mirror not found",
        success: false,
      };
    }

    // Product side authorized above; also require managing the connection.
    const connection = await dataConnectionsTable.fetchById(
      existing.connection_id
    );
    if (!connection || !(await canManageDataConnection(session, connection))) {
      return {
        fieldErrors: {},
        data: formData,
        message:
          "You must be an owner or maintainer of both the product and the data connection to edit its prefix",
        success: false,
      };
    }

    const updatedProduct = {
      ...product,
      metadata: {
        ...product.metadata,
        mirrors: {
          ...product.metadata.mirrors,
          [mirrorKey]: { ...existing, prefix },
        },
      },
    };

    await productsTable.update(updatedProduct, {
      expectedUpdatedAt: product.updated_at,
    });

    LOGGER.info("Successfully updated mirror prefix", {
      operation: "updateMirrorPrefix",
      metadata: { accountId, productId, mirrorKey },
    });

    revalidatePath(editProductDataConnectionsUrl(accountId, productId));

    return {
      fieldErrors: {},
      data: formData,
      message: "Prefix updated successfully!",
      success: true,
    };
  } catch (error) {
    if (isConcurrentEdit(error)) {
      return {
        fieldErrors: {},
        data: formData,
        message: CONCURRENT_EDIT_MESSAGE,
        success: false,
      };
    }
    LOGGER.error("Error updating mirror prefix", {
      operation: "updateMirrorPrefix",
      error,
    });
    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to update prefix. Please try again.",
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

    await productsTable.update(updatedProduct, {
      expectedUpdatedAt: product.updated_at,
    });

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
    if (isConcurrentEdit(error)) {
      return {
        fieldErrors: {},
        data: formData,
        message: CONCURRENT_EDIT_MESSAGE,
        success: false,
      };
    }
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
