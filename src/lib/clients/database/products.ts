import type { Product, ProductMirror } from "@/types";
import {
  PutItemCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-dynamodb";

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { accountsTable } from "./accounts";
import { BaseTable } from "./base";
import { marshall } from "@aws-sdk/util-dynamodb";

export class ProductsTable extends BaseTable {
  model = "products";

  private buildSearchText(product: {
    title?: string;
    description?: string;
    account_id: string;
    product_id: string;
  }): string {
    return [
      product.title,
      product.description,
      product.account_id,
      product.product_id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  async list(
    limit = 50,
    lastEvaluatedKey?: any
  ): Promise<{
    products: Product[];
    lastEvaluatedKey: any;
  }> {
    const scanParams: any = {
      TableName: this.table,
      Limit: limit,
      FilterExpression: "attribute_exists(account_id)", // Only get valid items
    };

    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await this.cachedSend(new ScanCommand(scanParams));

    return {
      products: [...(result.Items ?? [])] as Product[],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async listByAccount(
    account_id: string,
    limit = 50,
    lastEvaluatedKey?: any
  ): Promise<{
    products: Product[];
    lastEvaluatedKey: any;
  }> {
    const result = await this.cachedSend(
      new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: "account_id = :account_id",
        ExpressionAttributeValues: {
          ":account_id": account_id,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    return {
      products: ([...(result.Items ?? [])]) as Product[],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async listByAccountAll(account_id: string): Promise<Product[]> {
    const allProducts: Product[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const result = await this.listByAccount(
        account_id,
        1000,
        lastEvaluatedKey
      );
      allProducts.push(...result.products);
      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allProducts;
  }

  /**
   * Returns every product that mirrors data through the given data connection.
   *
   * There is no index on `metadata.mirrors[*].connection_id` (it lives inside a
   * DynamoDB map), so this scans the whole table and filters app-side. It
   * matches on each mirror's `connection_id` field rather than the map key, so
   * it is robust to legacy mirrors keyed by region (e.g. "aws-us-east-1") rather
   * than by connection id. Intended for low-traffic admin views; if product
   * volume grows large, replace with a denormalized connection index + GSI.
   */
  async listProductsByConnectionId(connectionId: string): Promise<Product[]> {
    const matches: Product[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const result = await this.list(1000, lastEvaluatedKey);
      for (const product of result.products) {
        const mirrors = Object.values(product.metadata?.mirrors ?? {});
        if (mirrors.some((mirror) => mirror.connection_id === connectionId)) {
          matches.push(product);
        }
      }
      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    return matches;
  }

  async listPublic(
    limit = 50,
    lastEvaluatedKey?: any,
    filters?: { search?: string; tags?: string; featuredOnly?: boolean }
  ): Promise<{
    products: Product[];
    lastEvaluatedKey: any;
  }> {
    const expressionValues: Record<string, any> = {
      ":visibility": "public",
    };
    const filterParts: string[] = [];

    let keyCondition = "visibility = :visibility";
    if (filters?.featuredOnly) {
      expressionValues[":zero"] = 0;
      keyCondition += " AND featured > :zero";
    }

    // Search uses a pre-computed `search_text` field (lowercased on write) with
    // DynamoDB `contains()`. This is a substring scan, not full-text search —
    // it won't scale well beyond ~10k products. At that point, consider a
    // dedicated search service (e.g. OpenSearch, Typesense).
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      expressionValues[":search"] = searchLower;
      filterParts.push("contains(search_text, :search)");
    }

    if (filters?.tags) {
      const tagsArray = filters.tags.split(",").map((t) => t.trim());
      tagsArray.forEach((tag, i) => {
        expressionValues[`:tag${i}`] = tag;
        filterParts.push(`contains(metadata.tags, :tag${i})`);
      });
    }

    const queryParams: any = {
      TableName: this.table,
      IndexName: "public_featured",
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: expressionValues,
      ScanIndexForward: false,
      // When filtering, read more items since DynamoDB applies Limit before FilterExpression
      Limit: filterParts.length > 0 ? Math.max(limit * 10, 1000) : limit,
    };

    if (filterParts.length > 0) {
      queryParams.FilterExpression = filterParts.join(" AND ");
    }

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await this.cachedSend(new QueryCommand(queryParams));

    return {
      products: ([...(result.Items ?? [])]) as Product[],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async fetchById(
    account_id: string,
    product_id: string
  ): Promise<Product | null> {
    try {
      const [result, account] = await Promise.all([
        this.cachedSend(
          new GetCommand({
            TableName: this.table,
            Key: {
              account_id,
              product_id,
            },
          })
        ),
        accountsTable.fetchById(account_id),
      ]);

      if (!result.Item) return null;

      return {
        ...(result.Item as Product),
        account: account || undefined,
      };
    } catch (error) {
      if (error instanceof ResourceNotFoundException) return null;

      this.logError("fetchById", error, { account_id, product_id });
      throw error;
    }
  }

  async create(product: Product): Promise<Product> {
    try {
      const item = { ...product, search_text: this.buildSearchText(product) };
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: item,
        })
      );
      return product;
    } catch (error) {
      this.logError("create", error, {
        productId: product.product_id,
        accountId: product.account_id,
      });
      throw error;
    }
  }

  async update(
    product: Product,
    // Optimistic lock: when set, the write only lands if the row's stored
    // updated_at still equals the value the caller read. A concurrent writer
    // bumps updated_at, so the condition fails (ConditionalCheckFailedException)
    // instead of silently clobbering their change. Omit it for last-write-wins.
    opts?: { expectedUpdatedAt?: string }
  ): Promise<Product> {
    try {
      const values: Record<string, unknown> = {
        ":title": product.title,
        ":description": product.description,
        ":updated_at": new Date().toISOString(),
        ":visibility": product.visibility,
        ":metadata": product.metadata,
        ":search_text": this.buildSearchText(product),
      };
      if (opts?.expectedUpdatedAt) {
        values[":expected_updated_at"] = opts.expectedUpdatedAt;
      }
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: {
            product_id: product.product_id,
            account_id: product.account_id,
          },
          UpdateExpression:
            "SET title = :title, description = :description, updated_at = :updated_at, visibility = :visibility, metadata = :metadata, search_text = :search_text",
          ...(opts?.expectedUpdatedAt
            ? { ConditionExpression: "updated_at = :expected_updated_at" }
            : {}),
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        })
      );
      return result.Attributes as Product;
    } catch (error) {
      this.logError("update", error, {
        productId: product.product_id,
        accountId: product.account_id,
      });
      throw error;
    }
  }

  // Legacy method for backward compatibility - renamed to upsert
  async upsert(
    product: Product,
    checkIfExists: boolean = false
  ): Promise<[Product, boolean]> {
    try {
      const item = { ...product, search_text: this.buildSearchText(product) };
      const command = new PutItemCommand({
        TableName: this.table,
        Item: marshall(item),
        ConditionExpression: checkIfExists
          ? "attribute_not_exists(product_id)"
          : undefined,
      });

      await this.client.send(command);
      return [product, true];
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return [product, false];
      }
      this.logError("upsert", error, {
        productId: product.product_id,
        accountId: product.account_id,
      });
      throw error;
    }
  }

  async updateMirror(
    product_id: string,
    account_id: string,
    mirror_key: string,
    mirror: ProductMirror
  ): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: {
          product_id,
          account_id,
        },
        UpdateExpression: "SET metadata.mirrors.#key = :mirror",
        ExpressionAttributeNames: {
          "#key": mirror_key,
        },
        ExpressionAttributeValues: {
          ":mirror": mirror,
        },
      })
    );
  }

  /**
   * Attach accounts to products records (client-side, no change to database records)
   * @param products - Products to attach accounts to
   * @returns Products with accounts attached
   */
  async attachAccounts(products: Product[]): Promise<Product[]> {
    if (!products.length) return products;

    const accounts = await accountsTable.fetchManyByIds(
      products.map((p) => p.account_id).filter((id) => id)
    );
    const accountMap = new Map(accounts.map((acc) => [acc.account_id, acc]));

    return products.map((item) => ({
      ...item,
      account: accountMap.get(item.account_id) || undefined,
    }));
  }
}

// Export a singleton instance
export const productsTable = new ProductsTable({});
