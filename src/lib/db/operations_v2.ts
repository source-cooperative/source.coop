import { GetCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Account, IndividualAccount, OrganizationalAccount } from '@/types/account_v2';
import type { Product_v2 as Product, ProductMirror, ProductRole } from '@/types/product_v2';
import { CONFIG } from '../config';

// Use the singleton client from clients/index.ts
import { getDynamoDb } from '../clients';

const docClient = getDynamoDb();

/**
 * Core account operations
 */

export async function fetchAccount(account_id: string): Promise<Account | null> {
  try {
    console.log('DB: Fetching account with ID:', account_id);
    // Try both individual and organization types
    const types = ['individual', 'organization'] as const;
    
    for (const type of types) {
      console.log(`DB: Trying to fetch account of type ${type} for ID:`, account_id);
      const result = await docClient.send(new GetCommand({
        TableName: "sc-accounts",
        Key: {
          account_id,
          type
        }
      }));
      
      if (result.Item) {
        console.log(`DB: Found account of type ${type} for ID:`, account_id);
        return result.Item as Account;
      }
    }
    
    console.log('DB: No account found for ID:', account_id);
    return null;
  } catch (e) {
    console.error(`Error fetching account with account_id ${account_id}:`, e);
    return null;
  }
}

export async function fetchAccountByEmail(email: string): Promise<Account | null> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "sc-accounts",
      IndexName: "AccountEmailIndex",
      KeyConditionExpression: "emails = :email",
      ExpressionAttributeValues: {
        ":email": email
      },
      Limit: 1
    }));

    if (!result.Items || result.Items.length === 0) return null;
    return result.Items[0] as Account;
  } catch (e) {
    console.error(`Error fetching account by email ${email}:`, e);
    return null;
  }
}

export async function fetchAccountsByType(type: 'individual' | 'organization'): Promise<Account[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "sc-accounts",
      IndexName: "AccountTypeIndex",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type"
      },
      ExpressionAttributeValues: {
        ":type": type
      }
    }));

    return (result.Items || []) as Account[];
  } catch (e) {
    console.error(`Error fetching accounts by type ${type}:`, e);
    return [];
  }
}

export async function updateAccount(account: Account): Promise<boolean> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "sc-accounts",
      Key: {
        account_id: account.account_id,
        type: account.type
      },
      UpdateExpression: "SET #name = :name, emails = :emails, updated_at = :updated_at, disabled = :disabled, flags = :flags, metadata_public = :metadata_public, metadata_private = :metadata_private",
      ExpressionAttributeNames: {
        "#name": "name" // name is a reserved word in DynamoDB
      },
      ExpressionAttributeValues: {
        ":name": account.name,
        ":emails": account.emails,
        ":updated_at": new Date().toISOString(),
        ":disabled": account.disabled,
        ":flags": account.flags,
        ":metadata_public": account.metadata_public,
        ":metadata_private": account.metadata_private
      }
    }));
    return true;
  } catch (e) {
    console.error(`Error updating account ${account.account_id}:`, e);
    return false;
  }
}

/**
 * Core product operations
 */

export async function fetchProduct(account_id: string, product_id: string): Promise<Product | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: "sc-products",
      Key: {
        product_id,
        account_id
      }
    }));

    if (!result.Item) return null;

    // Get the account for this product
    const account = await fetchAccount(account_id);
    
    return {
      ...result.Item as Product,
      account: account || undefined
    };
  } catch (e) {
    console.error(`Error fetching product ${product_id}:`, e);
    return null;
  }
}

export async function fetchProductsByAccount(account_id: string): Promise<Product[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: "sc-products",
      IndexName: "AccountProductsIndex",
      KeyConditionExpression: "account_id = :account_id",
      ExpressionAttributeValues: {
        ":account_id": account_id
      }
    }));

    // Get the account for these products
    const account = await fetchAccount(account_id);

    return (result.Items || []).map(item => ({
      ...item as Product,
      account: account || undefined
    }));
  } catch (e) {
    console.error(`Error fetching products for account ${account_id}:`, e);
    return [];
  }
}

export async function fetchProducts(
  limit = 50,
  lastEvaluatedKey?: any
): Promise<{
  products: Product[];
  lastEvaluatedKey: any;
}> {
  try {
    // Only use the products table now
    const tableName = "sc-products";
    let allItems: any[] = [];
    
    const scanParams: any = {
      TableName: tableName,
      Limit: limit,
      FilterExpression: "attribute_exists(account_id)" // Only get valid items
    };
    
    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    const result = await docClient.send(new ScanCommand(scanParams));
    if (result.Items) {
      allItems = [...allItems, ...result.Items];
    }
    
    // Get all unique account IDs
    const accountIds = new Set(allItems.map(item => item.account_id));
    
    // Fetch all accounts in parallel
    const accountPromises = Array.from(accountIds).map(id => fetchAccount(id));
    const accounts = await Promise.all(accountPromises);
    const accountMap = new Map(accounts.filter(Boolean).map(acc => [acc!.account_id, acc]));
    
    // Attach accounts to products
    const products = allItems.map(item => ({
      ...item as Product,
      account: accountMap.get(item.account_id) || undefined
    }));
    
    return {
      products,
      lastEvaluatedKey: undefined // Reset pagination since we're combining results
    };
  } catch (e) {
    console.error('Error fetching products:', e);
    return {
      products: [],
      lastEvaluatedKey: undefined
    };
  }
}

export async function fetchPublicProducts(
  limit = 50,
  lastEvaluatedKey?: any
): Promise<{
  products: Product[];
  lastEvaluatedKey: any;
}> {
  try {
    const queryParams: any = {
      TableName: "sc-products",
      IndexName: "PublicProductsIndex",
      KeyConditionExpression: "visibility = :visibility",
      ExpressionAttributeValues: {
        ":visibility": "public"
      },
      Limit: limit
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await docClient.send(new QueryCommand(queryParams));

    return {
      products: (result.Items || []) as Product[],
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (e) {
    console.error('Error fetching public products:', e);
    return {
      products: [],
      lastEvaluatedKey: null
    };
  }
}

export async function updateProduct(product: Product): Promise<boolean> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "sc-products",
      Key: {
        product_id: product.product_id,
        account_id: product.account_id
      },
      UpdateExpression: "SET title = :title, description = :description, updated_at = :updated_at, visibility = :visibility, metadata = :metadata",
      ExpressionAttributeValues: {
        ":title": product.title,
        ":description": product.description,
        ":updated_at": new Date().toISOString(),
        ":visibility": product.visibility,
        ":metadata": product.metadata
      }
    }));
    return true;
  } catch (e) {
    console.error(`Error updating product ${product.product_id}:`, e);
    return false;
  }
}

export async function updateProductRole(
  product_id: string,
  account_id: string,
  target_account_id: string,
  role: ProductRole
): Promise<boolean> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "sc-products",
      Key: {
        product_id,
        account_id
      },
      UpdateExpression: "SET metadata.roles.#target = :role",
      ExpressionAttributeNames: {
        "#target": target_account_id
      },
      ExpressionAttributeValues: {
        ":role": role
      }
    }));
    return true;
  } catch (e) {
    console.error(`Error updating product role for ${product_id}:`, e);
    return false;
  }
}

export async function updateProductMirror(
  product_id: string,
  account_id: string,
  mirror_key: string,
  mirror: ProductMirror
): Promise<boolean> {
  try {
    await docClient.send(new UpdateCommand({
      TableName: "sc-products",
      Key: {
        product_id,
        account_id
      },
      UpdateExpression: "SET metadata.mirrors.#key = :mirror",
      ExpressionAttributeNames: {
        "#key": mirror_key
      },
      ExpressionAttributeValues: {
        ":mirror": mirror
      }
    }));
    return true;
  } catch (e) {
    console.error(`Error updating product mirror for ${product_id}:`, e);
    return false;
  }
}

/**
 * Fetch members of an organization
 * 
 * @param orgAccount - The organizational account to fetch members for
 * @returns Object containing owner, admins, and members of the organization
 */
export async function fetchOrganizationMembers(orgAccount: OrganizationalAccount): Promise<{
  owner: IndividualAccount | null;
  admins: IndividualAccount[];
  members: IndividualAccount[];
}> {
  try {
    // Extract member IDs from the account's metadata
    const ownerId = orgAccount.metadata_public.owner_account_id;
    const adminIds = orgAccount.metadata_public.admin_account_ids || [];
    const memberIds = orgAccount.metadata_public.member_account_ids || [];
    
    // Fetch the owner account if available
    let owner: IndividualAccount | null = null;
    if (ownerId) {
      const ownerAccount = await fetchAccount(ownerId);
      if (ownerAccount && isIndividualAccount(ownerAccount)) {
        owner = ownerAccount;
      }
    }
    
    // Fetch admin accounts
    const adminPromises = adminIds.map(id => fetchAccount(id));
    const adminAccounts = await Promise.all(adminPromises);
    const admins = adminAccounts.filter((acc): acc is IndividualAccount => 
      acc !== null && isIndividualAccount(acc)
    );
    
    // Fetch member accounts
    const memberPromises = memberIds.map(id => fetchAccount(id));
    const memberAccounts = await Promise.all(memberPromises);
    const members = memberAccounts.filter((acc): acc is IndividualAccount => 
      acc !== null && isIndividualAccount(acc)
    );
    
    return {
      owner,
      admins,
      members
    };
  } catch (e) {
    console.error(`Error fetching organization members for ${orgAccount.account_id}:`, e);
    return {
      owner: null,
      admins: [],
      members: []
    };
  }
}

// Type guards
export const isIndividualAccount = (acc: Account): acc is IndividualAccount => 
  acc.type === 'individual';

export const isOrganizationalAccount = (acc: Account): acc is OrganizationalAccount => 
  acc.type === 'organization'; 