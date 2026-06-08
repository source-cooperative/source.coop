"use server";

import { productsTable, dataConnectionsTable } from "@/lib/clients/database";
import {
  Actions,
  DataProvider,
  ProductCreationRequestSchema,
  type Product,
  type ProductCreationRequest,
  type ProductMirror,
  type ProductVisibility,
} from "@/types";
import { getPageSession, LOGGER } from "@/lib";
import { FormState } from "@/components/core/DynamicForm";
import { isAuthorized } from "../api/authz";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { productUrl, editProductDetailsUrl } from "@/lib/urls";

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
          prefix: `${validatedFields.data.account_id}/${validatedFields.data.product_id}/`,
          is_primary: true,
        },
      },
    },
  };

  if (!isAuthorized(session, product, Actions.CreateRepository)) {
    return {
      fieldErrors: {},
      data: formData,
      message: "Unauthorized to create product",
      success: false,
    };
  }

  try {
    await productsTable.create(product);
    redirect(productUrl(product.account_id, product.product_id, "success"));
  } catch (error) {
    LOGGER.error("Failed to create product", {
      operation: "createProduct",
      context: "product creation",
      error: error,
      metadata: { product },
    });
    throw error;
  }
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

    // Enforce the connection's allowed visibilities when the visibility is
    // being changed. The edit form only offers permitted options, but the
    // server must reject disallowed combinations from tampered requests. The
    // connection itself is fixed at creation, so we resolve it from the
    // product's primary mirror rather than the form.
    if (visibility && visibility !== currentProduct.visibility) {
      const connectionId = currentProduct.metadata?.primary_mirror;
      const dataConnection = connectionId
        ? await dataConnectionsTable.fetchById(connectionId)
        : undefined;

      if (
        dataConnection &&
        !dataConnection.allowed_visibilities.includes(visibility)
      ) {
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
