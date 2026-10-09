"use server";

import { getTranslations } from "next-intl/server";
import { LOGGER } from "@/lib/logging";
import { canManageAccount } from "../api/authz";
import { getPageSession } from "../api/utils";
import { accountsTable, productsTable, dataConnectionsTable } from "../clients";
import { ProductMirror, resolveMirrorPrefix } from "@/types";
import { FormState } from "@/components/core/DynamicForm";
import { revalidatePath } from "next/cache";
import { editProductDataConnectionsUrl } from "@/lib/urls";
import {
  canManageDataConnection,
  canUseDataConnectionFor,
} from "@/lib/data-connections";

/**
 * A product's mirrors are the *owning account's* storage, so managing them is
 * gated on administering that account (owner/maintainer of the org, the
 * individual account itself, or an admin) — not on `PutRepository`, which a
 * membership scoped to this one product also satisfies.
 *
 * Returns the message to report when the caller is not permitted, or null when
 * they are.
 */
async function denyUnlessAccountManager(
  session: Awaited<ReturnType<typeof getPageSession>>,
  accountId: string
): Promise<string | null> {
  const t = await getTranslations("ProductMirrorActions");
  const account = await accountsTable.fetchById(accountId);
  if (!account || !canManageAccount(session, account)) {
    return t("notAccountManager");
  }
  return null;
}

// These three actions fetch → mutate → productsTable.update(). The update is an
// optimistic compare-and-swap on the product's updated_at, so two people editing
// the same product's mirrors concurrently can't silently clobber each other —
// the second write fails and the action reports a conflict instead.
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
  const t = await getTranslations("ProductMirrorActions");
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: t("unauthenticated"),
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
      message: t("missingFields"),
      success: false,
    };
  }

  try {
    // Authorize before any product/connection I/O, so an unprivileged caller
    // can't probe which products or connections exist.
    const denied = await denyUnlessAccountManager(session, accountId);
    if (denied) {
      return { fieldErrors: {}, data: formData, message: denied, success: false };
    }

    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("productNotFound"),
        success: false,
      };
    }

    const connection = await dataConnectionsTable.fetchById(connectionId);
    if (!connection) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("connectionNotFound"),
        success: false,
      };
    }

    // The connection must be available to this account: system-level (unowned)
    // or owned by it, and usable at all (not flag-gated).
    if (!canUseDataConnectionFor(session, connection, accountId)) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("connectionUnavailable"),
        success: false,
      };
    }

    if (product.metadata.mirrors[connectionId]) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("alreadyAssociated"),
        success: false,
      };
    }

    const prefix = resolveMirrorPrefix(
      connection.prefix_template,
      accountId,
      productId
    );

    const isFirst = Object.keys(product.metadata.mirrors).length === 0;

    const mirror: ProductMirror = {
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
      message: t("added"),
      success: true,
    };
  } catch (error) {
    if (isConcurrentEdit(error)) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("concurrentEdit"),
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
      message: t("addFailed"),
      success: false,
    };
  }
}

export async function removeProductMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const t = await getTranslations("ProductMirrorActions");
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: t("unauthenticated"),
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
      message: t("missingFields"),
      success: false,
    };
  }

  try {
    const denied = await denyUnlessAccountManager(session, accountId);
    if (denied) {
      return { fieldErrors: {}, data: formData, message: denied, success: false };
    }

    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("productNotFound"),
        success: false,
      };
    }

    if (!product.metadata.mirrors[mirrorKey]) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("mirrorNotFound"),
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
      message: t("removed"),
      success: true,
    };
  } catch (error) {
    if (isConcurrentEdit(error)) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("concurrentEdit"),
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
      message: t("removeFailed"),
      success: false,
    };
  }
}

// Editing a mirror's prefix is the *intersection* of the account gate the three
// actions above use AND managing the underlying connection
// (canManageDataConnection). Admins satisfy both.
//
// The connection half is not redundant: a prefix says where in the bucket this
// product's data lives, so on a shared system-level connection an unrestricted
// prefix would let one account point its product at another's objects. Only
// someone who controls the connection may re-point a mirror on it.
export async function updateMirrorPrefix(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const t = await getTranslations("ProductMirrorActions");
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: t("unauthenticated"),
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
      message: t("missingFields"),
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
      message: t("invalidPrefix"),
      success: false,
    };
  }
  const prefix =
    !rawPrefix || rawPrefix.endsWith("/") ? rawPrefix : `${rawPrefix}/`;

  try {
    const denied = await denyUnlessAccountManager(session, accountId);
    if (denied) {
      return { fieldErrors: {}, data: formData, message: denied, success: false };
    }

    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("productNotFound"),
        success: false,
      };
    }

    const existing = product.metadata.mirrors[mirrorKey];
    if (!existing) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("mirrorNotFound"),
        success: false,
      };
    }

    // Account side authorized above; also require managing the connection.
    const connection = await dataConnectionsTable.fetchById(
      existing.connection_id
    );
    if (!connection || !(await canManageDataConnection(session, connection))) {
      return {
        fieldErrors: {},
        data: formData,
        message:
          t("cannotEditPrefix"),
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
      message: t("prefixUpdated"),
      success: true,
    };
  } catch (error) {
    if (isConcurrentEdit(error)) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("concurrentEdit"),
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
      message: t("prefixUpdateFailed"),
      success: false,
    };
  }
}

export async function setPrimaryMirror(
  _prevState: FormState<unknown>,
  formData: FormData
): Promise<FormState<unknown>> {
  const t = await getTranslations("ProductMirrorActions");
  const session = await getPageSession();

  if (!session?.identity_id) {
    return {
      fieldErrors: {},
      data: formData,
      message: t("unauthenticated"),
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
      message: t("missingFields"),
      success: false,
    };
  }

  try {
    const denied = await denyUnlessAccountManager(session, accountId);
    if (denied) {
      return { fieldErrors: {}, data: formData, message: denied, success: false };
    }

    const product = await productsTable.fetchById(accountId, productId);
    if (!product) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("productNotFound"),
        success: false,
      };
    }

    if (!product.metadata.mirrors[mirrorKey]) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("mirrorNotFound"),
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
      message: t("primaryUpdated"),
      success: true,
    };
  } catch (error) {
    if (isConcurrentEdit(error)) {
      return {
        fieldErrors: {},
        data: formData,
        message: t("concurrentEdit"),
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
      message: t("primaryUpdateFailed"),
      success: false,
    };
  }
}
