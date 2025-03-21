# DynamoDB Development Guide

## Local Development Setup

### Prerequisites
- Docker installed
- AWS CLI installed (for local DynamoDB operations)

### Starting Local DynamoDB
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

### Environment Configuration
Add to `.env.local`:
```bash
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
AWS_REGION=us-east-1
```

### Table Creation
Tables are created automatically when the application starts in development mode. For manual creation:

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

# Create Repositories table
aws dynamodb create-table \
    --endpoint-url http://localhost:8000 \
    --table-name Repositories \
    --attribute-definitions \
        AttributeName=repository_id,AttributeType=S \
        AttributeName=account_id,AttributeType=S \
    --key-schema \
        AttributeName=repository_id,KeyType=HASH \
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
  TableName: 'Accounts',
  Key: { account_id, type }
});

// List accounts by type
const accounts = await dynamodb.query({
  TableName: 'Accounts',
  IndexName: 'GSI1',
  KeyConditionExpression: '#type = :type',
  ExpressionAttributeNames: { '#type': 'type' },
  ExpressionAttributeValues: { ':type': 'organization' }
});
```

### Repository Operations
```typescript
// Get repository by ID
const repository = await dynamodb.get({
  TableName: 'Repositories',
  Key: { repository_id, account_id }
});

// List repositories for account
const repositories = await dynamodb.query({
  TableName: 'Repositories',
  IndexName: 'GSI1',
  KeyConditionExpression: 'account_id = :account_id',
  ExpressionAttributeValues: { ':account_id': account_id }
});
```

## Testing

### Test Data Setup
```typescript
// Create test account
await dynamodb.put({
  TableName: 'Accounts',
  Item: {
    account_id: 'test-account',
    type: 'user',
    name: 'Test User',
    email: 'test@example.com',
    created_at: new Date().toISOString()
  }
});

// Create test repository
await dynamodb.put({
  TableName: 'Repositories',
  Item: {
    repository_id: 'test-repo',
    account_id: 'test-account',
    title: 'Test Repository',
    description: 'Test Description',
    created_at: new Date().toISOString()
  }
});
```

### Test Cleanup
```typescript
// Delete test account
await dynamodb.delete({
  TableName: 'Accounts',
  Key: { account_id: 'test-account', type: 'user' }
});

// Delete test repository
await dynamodb.delete({
  TableName: 'Repositories',
  Key: { repository_id: 'test-repo', account_id: 'test-account' }
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

3. **Query Issues**
   - Verify key schema matches query
   - Check expression attribute names/values
   - Ensure proper use of GSIs 