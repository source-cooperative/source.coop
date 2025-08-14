"use server";

import { productsTable } from "@/lib/clients/database";
import type { Product } from "@/types";

export interface PaginatedProductsResult {
  products: Product[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
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
        console.error("Failed to decode cursor:", error);
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
    console.error("Failed to fetch paginated products:", error);
    throw new Error("Failed to fetch products");
  }
}
