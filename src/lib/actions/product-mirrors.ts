"use server";

import {
  dataConnectionsTable,
  productsTable,
  accountsTable,
} from "@/lib/clients/database";
import { Actions, DataProvider } from "@/types";
import { getPageSession } from "@/lib/api/utils";
import { LOGGER } from "@/lib/logging";
import { isAuthorized } from "@/lib/api/authz";
import { revalidatePath } from "next/cache";
import { productUrl } from "@/lib/urls";

export interface AddProductMirrorResult {
  success: boolean;
  error?: string;
}

/**
 * Associates a data connection with a product as a new mirror.
 * Enforces the data connection's `required_flag`: the product's owning account
 * must hold that flag, or the call is rejected.
 */
export async function addProductMirror(
  productAccountId: string,
  productId: string,
  dataConnectionId: string,
): Promise<AddProductMirrorResult> {
  const session = await getPageSession();

  if (!session?.identity_id || !session.account) {
    return { success: false, error: "Unauthenticated" };
  }

  const dataConnection = await dataConnectionsTable.fetchById(dataConnectionId);
  if (!dataConnection) {
    return {
      success: false,
      error: `Data connection ${dataConnectionId} not found`,
    };
  }

  const ownerAccount = await accountsTable.fetchById(productAccountId);
  if (!ownerAccount) {
    return {
      success: false,
      error: `Account ${productAccountId} not found`,
    };
  }

  if (
    dataConnection.required_flag &&
    !ownerAccount.flags?.includes(dataConnection.required_flag)
  ) {
    return {
      success: false,
      error: `Account does not have required flag "${dataConnection.required_flag}" for the data connection`,
    };
  }

  const product = await productsTable.fetchById(productAccountId, productId);
  if (!product) {
    return {
      success: false,
      error: `Product ${productId} not found`,
    };
  }

  if (!isAuthorized(session, product, Actions.PutRepository)) {
    return { success: false, error: "Unauthorized" };
  }

  const storageType =
    dataConnection.details.provider === DataProvider.Azure ? "azure" : "s3";

  const prefix = dataConnection.prefix_template
    ? dataConnection.prefix_template
        .replace("{{account_id}}", productAccountId)
        .replace("{{product_id}}", productId)
    : `${productAccountId}/${productId}/`;

  const updatedProduct = {
    ...product,
    metadata: {
      ...product.metadata,
      mirrors: {
        ...product.metadata.mirrors,
        [dataConnectionId]: {
          storage_type: storageType,
          connection_id: dataConnectionId,
          prefix,
          is_primary: false,
        },
      },
    },
    updated_at: new Date().toISOString(),
  };

  try {
    await productsTable.update(updatedProduct);
  } catch (error) {
    LOGGER.error("Failed to add product mirror", {
      operation: "addProductMirror",
      context: "product mirror",
      error,
      metadata: { productAccountId, productId, dataConnectionId },
    });
    return { success: false, error: "Failed to add mirror" };
  }

  revalidatePath(productUrl(productAccountId, productId));

  return { success: true };
}
