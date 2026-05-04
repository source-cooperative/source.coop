"use server";

import { productsTable } from "@/lib/clients/database";
import {
  Actions,
  ProductCreationRequestSchema,
  type Product,
  type ProductCreationRequest,
  type ProductVisibility,
} from "@/types";
import { getPageSession, LOGGER } from "@/lib";
import { FormState } from "@/components/core/DynamicForm";
import { isAuthorized } from "../api/authz";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { productUrl, editProductDetailsUrl } from "@/lib/urls";

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

  const product: Product = {
    ...validatedFields.data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    disabled: false,
    featured: 0,

    metadata: {
      tags: [],
      primary_mirror: "aws-opendata-us-west-2",
      mirrors: {
        "aws-opendata-us-west-2": {
          storage_type: "s3",
          connection_id: "aws-opendata-us-west-2",
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
