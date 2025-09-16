"use server";

import { productsTable } from "@/lib/clients/database";
import {
  Actions,
  ProductCreationRequestSchema,
  type Product,
  type ProductCreationRequest,
  ProductDataMode,
} from "@/types";
import { getPageSession, LOGGER } from "@/lib";
import { FormState } from "@/components/core/DynamicForm";
import { isAuthorized } from "../api/authz";
import { redirect } from "next/navigation";

export interface PaginatedProductsResult {
  products: Product[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export interface GetProductsOptions {
  search?: string;
  tags?: string;
  cursor?: string;
  limit?: number;
  featuredOnly?: boolean;
}

export interface GetProductsResult {
  products: Product[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export async function getProducts(
  options: GetProductsOptions
): Promise<GetProductsResult> {
  const { search, tags, cursor, limit = 20, featuredOnly = false } = options;

  try {
    // Get products - use featured products for homepage, all public for products page
    let allProducts: Product[];
    if (featuredOnly) {
      // For homepage, get featured products and limit to 10
      const result = await productsTable.listPublic(10);
      allProducts = result.products;
    } else {
      // For products page, get all public products for filtering
      const result = await productsTable.listPublic(1000);
      allProducts = result.products;
    }

    // Filter products based on search and tags (only when not featuredOnly)
    let filteredProducts = allProducts;
    if (!featuredOnly) {
      filteredProducts = allProducts.filter((product) => {
        // Skip disabled products
        if (product.disabled) {
          return false;
        }

        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesSearch =
            product.title.toLowerCase().includes(searchLower) ||
            (product.description &&
              product.description.toLowerCase().includes(searchLower)) ||
            product.account_id.toLowerCase().includes(searchLower) ||
            product.product_id.toLowerCase().includes(searchLower);

          if (!matchesSearch) {
            return false;
          }
        }

        // Apply tags filter
        if (tags) {
          const tagsArray = tags
            .split(",")
            .map((tag) => tag.trim().toLowerCase());
          const productTags = product.metadata?.tags || [];
          const hasMatchingTag = tagsArray.some((tag) =>
            productTags.some((productTag) =>
              productTag.toLowerCase().includes(tag)
            )
          );

          if (!hasMatchingTag) {
            return false;
          }
        }

        return true;
      });

      // Sort by creation date (newest first) for products page
      filteredProducts.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB.getTime() - dateA.getTime();
      });
    } else {
      // For featured products, sort by featured score (already done by listPublic)
      filteredProducts = allProducts;
    }

    // Apply pagination (only for products page, not homepage)
    let paginatedProducts = filteredProducts;
    let startIndex = 0;
    let endIndex = filteredProducts.length;

    if (!featuredOnly && cursor) {
      try {
        const decodedCursor = JSON.parse(
          Buffer.from(cursor, "base64").toString()
        );
        startIndex = decodedCursor.startIndex || 0;
      } catch (error) {
        LOGGER.error("Failed to decode pagination cursor", {
          operation: "getProducts",
          context: "cursor decoding",
          error: error,
        });
      }

      endIndex = startIndex + limit;
      paginatedProducts = filteredProducts.slice(startIndex, endIndex);
    }

    // Attach account information
    const productsWithAccounts = await productsTable.attachAccounts(
      paginatedProducts
    );

    // Prepare cursors (only for products page)
    let nextCursor: string | undefined;
    let previousCursor: string | undefined;

    if (!featuredOnly) {
      nextCursor =
        filteredProducts.length > endIndex
          ? Buffer.from(JSON.stringify({ startIndex: endIndex })).toString(
              "base64"
            )
          : undefined;

      previousCursor =
        startIndex > 0
          ? Buffer.from(
              JSON.stringify({ startIndex: Math.max(0, startIndex - limit) })
            ).toString("base64")
          : undefined;
    }

    return {
      products: productsWithAccounts,
      totalCount: featuredOnly
        ? filteredProducts.length
        : filteredProducts.length,
      hasNextPage: featuredOnly ? false : !!nextCursor,
      hasPreviousPage: featuredOnly ? false : !!previousCursor,
      nextCursor,
      previousCursor,
    };
  } catch (error) {
    LOGGER.error("Failed to fetch products", {
      operation: "getProducts",
      context: "product fetching",
      error: error,
    });
    throw new Error("Failed to fetch products");
  }
}

export async function getPaginatedProducts(
  limit = 20,
  cursor?: string,
  previousCursor?: string,
  accountId?: string
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
        lastEvaluatedKey
      );
    } else {
      // Fetch public products using public_featured index
      result = await productsTable.listPublic(limit, lastEvaluatedKey);
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
  formData: FormData
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
    Object.fromEntries(formData)
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
    data_mode: ProductDataMode.Open,
    metadata: {
      // TODO: Add required metadata
      tags: [],
      primary_mirror: "",
      mirrors: {},
      roles: {},
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
    redirect(`/${product.account_id}/${product.product_id}?success`);
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
