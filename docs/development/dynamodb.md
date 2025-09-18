# DynamoDB Development Guide

## Local Development Setup

### Prerequisites

- Docker installed
- AWS CLI installed (for local DynamoDB operations)

### Starting Local DynamoDB

```bash
docker compose up
```

### Environment Configuration

Add to `.env.local`:

```bash
DYNAMODB_ENDPOINT=http://localhost:8000
```

### Admin

Along with a local DynamoDB instance, the project's Docker Compose file also runs an instance of [DynamoDB Admin](https://github.com/aaronshaf/dynamodb-admin) to allow for direct edits to local data. This service is accessible at http://localhost:8001.

### Table Creation

Tables are created automatically when the application starts in development mode.

For manual creation:

```bash
# Create Accounts table
aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --table-name Accounts \
    --attribute-definitions \
        AttributeName=account_id,AttributeType=S \
        AttributeName=type,AttributeType=S \
    --key-schema \
        AttributeName=account_id,KeyType=HASH \
        AttributeName=type,KeyType=RANGE \
    --global-secondary-indexes \
        "[{\"IndexName\": \"GSI1\",\"KeySchema\":[{\"AttributeName\":\"type\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"account_id\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

# Create products table
aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --table-name products \
    --attribute-definitions \
        AttributeName=product_id,AttributeType=S \
        AttributeName=account_id,AttributeType=S \
    --key-schema \
        AttributeName=product_id,KeyType=HASH \
        AttributeName=account_id,KeyType=RANGE \
    --global-secondary-indexes \
        "[{\"IndexName\": \"GSI1\",\"KeySchema\":[{\"AttributeName\":\"account_id\",\"KeyType\":\"HASH\"},{\"AttributeName\":\"created_at\",\"KeyType\":\"RANGE\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

## Common Query Patterns

### Account Operations

```typescript
// Get account by ID
const account = await dynamodb.get({
  TableName: "Accounts",
  Key: { account_id, type },
});

// List accounts by type
const accounts = await dynamodb.query({
  TableName: "Accounts",
  IndexName: "GSI1",
  KeyConditionExpression: "#type = :type",
  ExpressionAttributeNames: { "#type": "type" },
  ExpressionAttributeValues: { ":type": "organization" },
});
```

### product Operations

```typescript
// Get product by ID
const product = await dynamodb.get({
  TableName: "products",
  Key: { product_id, account_id },
});

// List products for account
const products = await dynamodb.query({
  TableName: "products",
  IndexName: "GSI1",
  KeyConditionExpression: "account_id = :account_id",
  ExpressionAttributeValues: { ":account_id": account_id },
});
```

## Testing

### Test Data Setup

```typescript
// Create test account
await dynamodb.put({
  TableName: "Accounts",
  Item: {
    account_id: "test-account",
    type: "user",
    name: "Test User",
    email: "test@example.com",
    created_at: new Date().toISOString(),
  },
});

// Create test product
await dynamodb.put({
  TableName: "products",
  Item: {
    product_id: "test-repo",
    account_id: "test-account",
    title: "Test Product",
    description: "Test Description",
    created_at: new Date().toISOString(),
  },
});
```

### Test Cleanup

```typescript
// Delete test account
await dynamodb.delete({
  TableName: "Accounts",
  Key: { account_id: "test-account", type: "user" },
});

// Delete test product
await dynamodb.delete({
  TableName: "products",
  Key: { product_id: "test-repo", account_id: "test-account" },
});
```

## Best Practices

1. **Query Optimization**

   - Use precise queries instead of scans
   - Leverage GSIs for common access patterns
   - Use projection expressions to limit returned attributes

2. **Error Handling**

   - Handle conditional check failures
   - Implement retry logic for transient errors
   - Log all DynamoDB errors with context

3. **Data Validation**

   - Validate data before writing to DynamoDB
   - Use TypeScript types for type safety
   - Implement schema validation for critical fields

4. **Performance**
   - Use batch operations when possible
   - Implement proper caching strategies
   - Monitor query patterns and adjust indexes

## Common Issues

1. **Local DynamoDB Connection**

   - Ensure Docker container is running
   - Verify endpoint URL in environment
   - Check AWS credentials are set correctly

2. **Table Creation**
   - Wait for table to be ACTIVE before use
   - Verify GSIs are created correctly
   - Check provisioned throughput settings

## Database Operations Framework

The application uses an optimized database operations framework in `src/lib/db/operations.ts` with standardized patterns for accessing DynamoDB data.

### Helper Functions

```typescript
// Fetch a single entity by a field value
async function getEntityByField<T>(
  tableName: string,
  fieldName: string,
  fieldValue: string,
  indexName?: string
): Promise<T | null>;

// Query for a collection of entities
async function queryEntities<T>(
  tableName: string,
  keyCondition: string,
  expressionValues: Record<string, any>,
  indexName?: string,
  limit?: number,
  expressionNames?: Record<string, string>
): Promise<T[]>;

// Batch fetch entities by IDs (when applicable)
async function batchGetEntitiesByIds<T>(
  tableName: string,
  idField: string,
  ids: string[]
): Promise<T[]>;
```

### Account Operations

```typescript
// Get account by ID
const account = await accountsTable.fetchById("account123");

// Get account by email
const account = await accountsTable.fetchByEmail("user@example.com");

// Get accounts by type
const organizations = await accountsTable.listByType("organization");
```

### product Operations

```typescript
// Get products for an account
const products = await fetchProductsByAccount("account123");

// Get single product
const product = await fetchProduct("repo123", "account123");

// Get all products with pagination
const { products, lastEvaluatedKey } = await fetchProducts(50);
// Get next page
const nextPage = await fetchProducts(50, lastEvaluatedKey);
```

### Update Operations

All update operations return a boolean success indicator:

```typescript
// Update an account
const success = await updateAccount(account);

// Update an organization
const success = await updateOrganization(orgAccount);

// Update a product
const success = await updateProduct(product);
```

### Error Handling Strategy

- All retrieval operations return `null` or empty arrays on error
- All update operations return a boolean success indicator
- Errors are logged with context but not propagated to avoid crashes
- Consistent error patterns make error handling more predictable

3. **Query Issues**
   - Verify key schema matches query
   - Check expression attribute names/values
   - Ensure proper use of GSIs
