"use server";

import { productsTable, membershipsTable, dataConnectionsTable } from "@/lib/clients/database";
import {
  Actions,
  DataProvider,
  ProductCreationRequestSchema,
  type Product,
  type ProductCreationRequest,
  type ProductMirror,
  type ProductVisibility,
  resolveMirrorPrefix,
} from "@/types";
import { getPageSession, LOGGER } from "@/lib";
import { FormState } from "@/components/core/DynamicForm";
import { isAuthorized } from "../api/authz";
import { revalidatePath } from "next/cache";
import { productUrl, editProductDetailsUrl, accountUrl } from "@/lib/urls";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { CONFIG } from "@/lib/config";

// Map a data connection's storage provider to the product mirror's storage_type.
const STORAGE_TYPE_BY_PROVIDER: Record<
  DataProvider,
  ProductMirror["storage_type"]
> = {
  [DataProvider.S3]: "s3",
  [DataProvider.Azure]: "azure",
  [DataProvider.GCP]: "gcs",
};

export interface PaginatedProductsResult {
  products: Product[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

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

export async function getPaginatedProducts(
  limit = 20,
  cursor?: string,
  previousCursor?: string,
  accountId?: string,
  filters?: { search?: string; tags?: string; featuredOnly?: boolean },
): Promise<PaginatedProductsResult> {
  try {
    let lastEvaluatedKey: any = undefined;

    if (cursor) {
      try {
        lastEvaluatedKey = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch (error) {
        LOGGER.error("Failed to decode cursor", {
          operation: "getPaginatedProducts",
          context: "cursor decoding",
          error: error,
        });
      }
    }

    let result: { products: Product[]; lastEvaluatedKey: any };

    if (accountId) {
      // Fetch products for specific account using account_products index
      result = await productsTable.listByAccount(
        accountId,
        limit,
        lastEvaluatedKey,
      );
    } else {
      // Fetch public products using public_featured index
      result = await productsTable.listPublic(limit, lastEvaluatedKey, filters);
    }

    const nextCursor = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString("base64")
      : undefined;

    return {
      products: await productsTable.attachAccounts(result.products),
      hasNextPage: !!result.lastEvaluatedKey,
      hasPreviousPage: !!cursor, // If we have a cursor, we can go back to first page
      nextCursor,
      previousCursor: previousCursor || undefined, // Use provided previous cursor or undefined
    };
  } catch (error) {
    LOGGER.error("Failed to fetch paginated products", {
      operation: "getPaginatedProducts",
      context: "product fetching",
      error: error,
    });
    throw new Error("Failed to fetch products");
  }
}

export async function createProduct(
  initialState: any,
  formData: FormData,
): Promise<FormState<ProductCreationRequest>> {
  const session = await getPageSession();

  if (!session?.identity_id || !session.account) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthenticated",
      success: false,
    };
  }

  const validatedFields = ProductCreationRequestSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!validatedFields.success) {
    return {
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      data: formData,
      message: "Invalid form data",
      success: false,
    };
  }

  // Authorize creation before any data-connection I/O. createRepository only
  // inspects account_id/product_id, so checking here means a caller who may
  // not create products under this account is rejected before they can probe
  // whether a data_connection_id exists or learn its visibility policy.
  if (
    !isAuthorized(
      session,
      {
        account_id: validatedFields.data.account_id,
        product_id: validatedFields.data.product_id,
      } as Product,
      Actions.CreateRepository,
    )
  ) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthorized to create product",
      success: false,
    };
  }

  const dataConnectionId = formData.get("data_connection_id");
  if (typeof dataConnectionId !== "string" || dataConnectionId.length === 0) {
    return {
      fieldErrors: { data_connection_id: ["A data connection is required"] },
      data: formData,
      message: "Invalid form data",
      success: false,
    };
  }

  const dataConnection = await dataConnectionsTable.fetchById(dataConnectionId);
  if (!dataConnection) {
    return {
      fieldErrors: {
        data_connection_id: ["Selected data connection was not found"],
      },
      data: formData,
      message: "Invalid data connection",
      success: false,
    };
  }

  // Enforce that the user may create products against this connection. This
  // covers read-only connections and connections gated behind an account flag.
  if (!isAuthorized(session, dataConnection, Actions.UseDataConnection)) {
    return {
      fieldErrors: {},
      data: formData,
      message: "You are not permitted to use the selected data connection",
      success: false,
    };
  }

  // Enforce that the connection is available for the product's account. An
  // owned connection may only be used by the account that owns it.
  if (
    dataConnection.owner &&
    dataConnection.owner !== validatedFields.data.account_id
  ) {
    return {
      fieldErrors: {
        data_connection_id: [
          "Selected data connection is not available for this account",
        ],
      },
      data: formData,
      message: "Invalid data connection for this account",
      success: false,
    };
  }

  // Enforce the connection's allowed visibilities. Even though the form only
  // offers permitted options, the server must reject disallowed combinations.
  if (
    !dataConnection.allowed_visibilities.includes(validatedFields.data.visibility)
  ) {
    return {
      fieldErrors: {
        visibility: [
          `The "${dataConnection.name}" data connection does not allow ${validatedFields.data.visibility} products`,
        ],
      },
      data: formData,
      message: "Invalid visibility for the selected data connection",
      success: false,
    };
  }

  const product: Product = {
    ...validatedFields.data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    disabled: false,
    featured: 0,
    metadata: {
      tags: [],
      primary_mirror: dataConnection.data_connection_id,
      mirrors: {
        [dataConnection.data_connection_id]: {
          storage_type:
            STORAGE_TYPE_BY_PROVIDER[dataConnection.details.provider],
          connection_id: dataConnection.data_connection_id,
          prefix: resolveMirrorPrefix(
            dataConnection.prefix_template,
            validatedFields.data.account_id,
            validatedFields.data.product_id
          ),
          is_primary: true,
        },
      },
    },
  };

  try {
    await productsTable.create(product);
  } catch (error) {
    LOGGER.error("Failed to create product", {
      operation: "createProduct",
      context: "product creation",
      error: error,
      metadata: { product },
    });
    throw error;
  }

  // Navigate on the client (see FormState.redirectTo) rather than redirect()
  // here, so the shared layout's auth UI re-renders with the current session.
  return {
    fieldErrors: {},
    data: formData,
    message: "",
    success: true,
    redirectTo: productUrl(product.account_id, product.product_id, "success"),
  };
}

export async function updateProduct(
  initialState: any,
  formData: FormData,
): Promise<FormState<Partial<Product>>> {
  const session = await getPageSession();

  if (!session?.identity_id || !session.account) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthenticated",
      success: false,
    };
  }

  const accountId = formData.get("account_id") as string;
  const productId = formData.get("product_id") as string;

  if (!accountId || !productId) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Account ID and Product ID are required",
      success: false,
    };
  }

  try {
    // Get the current product
    const currentProduct = await productsTable.fetchById(accountId, productId);
    if (!currentProduct) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Product not found",
        success: false,
      };
    }

    // Check authorization
    if (!isAuthorized(session, currentProduct, Actions.PutRepository)) {
      return {
        fieldErrors: {},
        data: formData,
        message: "Unauthorized to update this product",
        success: false,
      };
    }

    // Extract form data
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const visibility = formData.get("visibility") as ProductVisibility;
    // Activation toggle. The select submits "true"/"false"; absent (e.g. an
    // older form) leaves the current value untouched. Note: authorization above
    // already blocks non-admins from updating an already-disabled product, so
    // reactivation is admin-only — by design, disabled products are inaccessible.
    const disabledRaw = formData.get("disabled");
    const disabled =
      disabledRaw === null ? currentProduct.disabled : disabledRaw === "true";

    // Enforce the connection's allowed visibilities when the visibility is
    // being changed. The edit form only offers permitted options, but the
    // server must reject disallowed combinations from tampered requests. The
    // connection itself is fixed at creation, so we resolve it from the
    // product's primary mirror rather than the form. This branch only runs on
    // an actual visibility change, so unrelated edits (title, description) are
    // never blocked by it.
    if (visibility && visibility !== currentProduct.visibility) {
      const connectionId = currentProduct.metadata?.primary_mirror;
      const dataConnection = connectionId
        ? await dataConnectionsTable.fetchById(connectionId)
        : null;

      // Without a resolvable connection we cannot know the allowed set, so a
      // missing/deleted connection is a hard rejection rather than a free pass
      // to set any visibility. The product keeps its current visibility.
      if (!dataConnection) {
        return {
          fieldErrors: {
            visibility: [
              "This product's data connection could not be found, so its visibility cannot be changed",
            ],
          },
          data: formData,
          message: "Data connection not found for this product",
          success: false,
        };
      }

      if (!dataConnection.allowed_visibilities.includes(visibility)) {
        return {
          fieldErrors: {
            visibility: [
              `The "${dataConnection.name}" data connection does not allow ${visibility} products`,
            ],
          },
          data: formData,
          message: "Invalid visibility for the product's data connection",
          success: false,
        };
      }
    }

    // Build update data
    const updateData = {
      ...currentProduct,
      title: title || currentProduct.title,
      description: description || currentProduct.description,
      visibility: visibility || currentProduct.visibility,
      disabled,
      updated_at: new Date().toISOString(),
    };

    // Update the product
    await productsTable.update(updateData);

    LOGGER.info("Successfully updated product", {
      operation: "updateProduct",
      context: "product update",
      metadata: { accountId, productId },
    });

    // Revalidate the product page to show updated data
    revalidatePath(productUrl(accountId, productId));
    revalidatePath(editProductDetailsUrl(accountId, productId));

    return {
      fieldErrors: {},
      data: formData,
      message: "Product updated successfully!",
      success: true,
    };
  } catch (error) {
    LOGGER.error("Error updating product", {
      operation: "updateProduct",
      context: "product update",
      error: error,
      metadata: { accountId, productId },
    });

    return {
      fieldErrors: {},
      data: formData,
      message: "Failed to update product. Please try again.",
      success: false,
    };
  }
}

async function deleteAllS3Objects(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const listResult = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );

    const objects = listResult.Contents ?? [];
    if (objects.length > 0) {
      const deleteResult = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key! })),
            Quiet: true,
          },
        })
      );
      if (deleteResult.Errors?.length) {
        throw new Error(
          `Failed to delete ${deleteResult.Errors.length} S3 object(s): ` +
            deleteResult.Errors.map((e) => e.Key).join(", ")
        );
      }
    }

    continuationToken = listResult.IsTruncated
      ? listResult.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

export async function deleteProduct(
  account_id: string,
  product_id: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getPageSession();

  if (!session?.identity_id || !session.account) {
    return { success: false, error: "Unauthenticated" };
  }

  const product = await productsTable.fetchById(account_id, product_id);
  if (!product) {
    return { success: false, error: "Product not found" };
  }

  if (!isAuthorized(session, product, Actions.DeleteRepository)) {
    return { success: false, error: "Unauthorized to delete this product" };
  }

  try {
    const primaryMirror =
      product.metadata.mirrors[product.metadata.primary_mirror];

    if (primaryMirror) {
      const dataConnection = await dataConnectionsTable.fetchById(
        primaryMirror.connection_id
      );

      if (dataConnection && !dataConnection.read_only) {
        if (dataConnection.details.provider === DataProvider.S3) {
          // TODO: Replace IAM credentials with user's credentials via data proxy
          const s3Client = new S3Client({
            region: dataConnection.details.region,
            credentials: CONFIG.database.credentials,
          });

          await deleteAllS3Objects(
            s3Client,
            dataConnection.details.bucket,
            primaryMirror.prefix
          );
        }
      }
    }

    await membershipsTable.deleteByProduct(account_id, product_id);
    await productsTable.delete(account_id, product_id);

    LOGGER.info("Successfully deleted product", {
      operation: "deleteProduct",
      context: "product deletion",
      metadata: { account_id, product_id },
    });

    // Drop cached pages for the deleted product and the account listing it
    // appeared on, so other users stop seeing the now-removed product.
    revalidatePath(productUrl(account_id, product_id));
    revalidatePath(editProductDetailsUrl(account_id, product_id));
    revalidatePath(accountUrl(account_id));

    return { success: true };
  } catch (error) {
    LOGGER.error("Error deleting product", {
      operation: "deleteProduct",
      context: "product deletion",
      error: error,
      metadata: { account_id, product_id },
    });

    // Surface the underlying cause (e.g. S3 "Access Denied") instead of a
    // generic "try again" — most failures here are not transient.
    const reason = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Failed to delete product: ${reason}` };
  }
}
