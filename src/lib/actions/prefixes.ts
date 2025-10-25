"use server";

import { storage } from "@/lib";

export interface FetchPrefixesParams {
  accountId: string;
  productId: string;
  currentPath: string;
}

export interface PrefixSuggestion {
  name: string;
  fullPath: string;
}

/**
 * Fetch directory prefixes for autocomplete
 * Only returns one level of directories from the current path
 */
export async function fetchPrefixes(
  params: FetchPrefixesParams
): Promise<PrefixSuggestion[]> {
  const { accountId, productId, currentPath } = params;

  try {
    // List objects at current path to get directories
    const result = await storage.listObjects({
      account_id: accountId,
      product_id: productId,
      object_path: "",
      prefix: currentPath,
      delimiter: "/",
      maxKeys: 100,
    });

    // Filter for directories only and map to suggestions
    return result.commonPrefixes
      .map((prefix) => {
        // Remove trailing slash and get just the directory name
        const cleanPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
        const parts = cleanPrefix.split("/");
        const name = parts[parts.length - 1];

        return {
          name,
          fullPath: prefix,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to fetch prefixes:", error);
    return [];
  }
}
