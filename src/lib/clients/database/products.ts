import type {
  Product_v2 as Product,
  ProductMirror,
  ProductRole,
} from "@/types";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { accountsTable } from "./accounts";
import { BaseTable } from "./base";

class ProductsTable extends BaseTable {
  async listPublic(
    limit = 50,
    lastEvaluatedKey?: any
  ): Promise<{
    products: Product[];
    lastEvaluatedKey: any;
  }> {
    const queryParams: any = {
      TableName: this.table,
      IndexName: "PublicProductsIndex",
      KeyConditionExpression: "visibility = :visibility",
      ExpressionAttributeValues: {
        ":visibility": "public",
      },
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

  async listByAccount(account_id: string): Promise<Product[]> {
    const [result, account] = await Promise.all([
      this.client.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: "AccountProductsIndex",
          KeyConditionExpression: "account_id = :account_id",
          ExpressionAttributeValues: {
            ":account_id": account_id,
          },
        })
      ),
      accountsTable.fetchById(account_id),
    ]);

    return (result.Items || []).map((item: any) => ({
      ...(item as Product),
      account: account || undefined,
    }));
  }

  async listFeatured(): Promise<Product[]> {
    // TODO: This doesn't work yet
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.table,
        IndexName: "PublicProductsIndex",
        KeyConditionExpression: "visibility = :visibility",
        ExpressionAttributeValues: {
          ":visibility": "public",
        },
      })
    );
    return result.Items || [];
  }

  async fetchById(
    account_id: string,
    product_id: string
  ): Promise<Product | null> {
    const [result, account] = await Promise.all([
      this.client.send(
        new GetCommand({
          TableName: this.table,
          Key: {
            product_id,
            account_id,
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
  }

  async create(product: Product): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.table,
        Item: product,
      })
    );
  }

  async update(product: Product): Promise<void> {
    await this.client.send(
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
      })
    );
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
   * Attach accounts to products
   * @param products - Products to attach accounts to
   * @returns Products with accounts attached
   */
  async attachAccounts(products: Product[]): Promise<Product[]> {
    // Fetch all accounts in parallel
    const accounts = await Promise.all(
      Array.from(new Set(products.map((item) => item.account_id))).map((id) =>
        accountsTable.fetchById(id)
      )
    );
    const accountMap = new Map(
      accounts.filter(Boolean).map((acc: any) => [acc!.account_id, acc])
    );

    // Attach accounts to products
    return products.map((item: any) => ({
      ...item,
      account: accountMap.get(item.account_id) || undefined,
    }));
  }
}

// Export a singleton instance
export const productsTable = new ProductsTable({
  table: "sc-products",
});
