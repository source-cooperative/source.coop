import type { Product, ProductMirror, ProductRole } from "@/types";
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
import { LOGGER } from "@/lib/logging";
import { marshall } from "@aws-sdk/util-dynamodb";

class ProductsTable extends BaseTable {
  model = "products";

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

    const result = await this.client.send(new ScanCommand(scanParams));

    return {
      products: (result.Items || []) as Product[],
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
    const result = await this.client.send(
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
      products: (result.Items || []) as Product[],
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

  async listPublic(
    limit = 50,
    lastEvaluatedKey?: any
  ): Promise<{
    products: Product[];
    lastEvaluatedKey: any;
  }> {
    const queryParams: any = {
      TableName: this.table,
      IndexName: "public_featured",
      KeyConditionExpression: "visibility = :visibility",
      ExpressionAttributeValues: {
        ":visibility": "public",
      },
      ScanIndexForward: false, // Descending order of featured
      Limit: limit,
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await this.client.send(new QueryCommand(queryParams));

    return {
      products: (result.Items || []) as Product[],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async fetchById(
    account_id: string,
    product_id: string
  ): Promise<Product | null> {
    try {
      const [result, account] = await Promise.all([
        this.client.send(
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
      await this.client.send(
        new PutCommand({
          TableName: this.table,
          Item: product,
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

  async update(product: Product): Promise<Product> {
    try {
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.table,
          Key: {
            product_id: product.product_id,
            account_id: product.account_id,
          },
          UpdateExpression:
            "SET title = :title, description = :description, updated_at = :updated_at, visibility = :visibility, metadata = :metadata",
          ExpressionAttributeValues: {
            ":title": product.title,
            ":description": product.description,
            ":updated_at": new Date().toISOString(),
            ":visibility": product.visibility,
            ":metadata": product.metadata,
          },
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
      const command = new PutItemCommand({
        TableName: this.table,
        Item: marshall(product),
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

  async updateRole(
    product_id: string,
    account_id: string,
    target_account_id: string,
    role: ProductRole
  ): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.table,
        Key: {
          product_id,
          account_id,
        },
        UpdateExpression: "SET metadata.roles.#target = :role",
        ExpressionAttributeNames: {
          "#target": target_account_id,
        },
        ExpressionAttributeValues: {
          ":role": role,
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

    const accountMap = await accountsTable.fetchManyByIds([
      ...new Set(products.map((p) => p.account_id).filter((id) => id)),
    ]);

    return products.map((item) => ({
      ...item,
      account: accountMap.get(item.account_id) || undefined,
    }));
  }
}

// Export a singleton instance
export const productsTable = new ProductsTable({});
