# Migration Scripts

This document contains the implementation details for the migration scripts.

## Overview

The migration process uses several scripts to:
1. Create new tables
2. Migrate data
3. Validate the migration
4. Handle rollback if needed

## Script Structure

```
scripts/migration/
├── create-tables.ts      # Creates new DynamoDB tables
├── migrate-data.ts       # Main migration script
├── validate.ts          # Data validation
├── rollback.ts          # Rollback procedures
└── utils/
    ├── types.ts         # TypeScript interfaces
    ├── dynamodb.ts      # DynamoDB utilities
    └── validation.ts    # Validation helpers
```

## Implementation Details

### 1. Create Tables Script

```typescript
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});

async function createTables() {
  // Create Accounts table
  await client.send(new CreateTableCommand({
    TableName: "Accounts_v2",
    AttributeDefinitions: [
      { AttributeName: "account_id", AttributeType: "S" },
      { AttributeName: "type", AttributeType: "S" },
      { AttributeName: "email", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "account_id", KeyType: "HASH" },
      { AttributeName: "type", KeyType: "RANGE" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [
          { AttributeName: "type", KeyType: "HASH" },
          { AttributeName: "account_id", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: "GSI2",
        KeySchema: [
          { AttributeName: "email", KeyType: "HASH" },
          { AttributeName: "account_id", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  }));

  // Create Repositories table
  await client.send(new CreateTableCommand({
    TableName: "Repositories_v2",
    AttributeDefinitions: [
      { AttributeName: "repository_id", AttributeType: "S" },
      { AttributeName: "account_id", AttributeType: "S" },
      { AttributeName: "created_at", AttributeType: "S" }
    ],
    KeySchema: [
      { AttributeName: "repository_id", KeyType: "HASH" },
      { AttributeName: "account_id", KeyType: "RANGE" }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GSI1",
        KeySchema: [
          { AttributeName: "account_id", KeyType: "HASH" },
          { AttributeName: "created_at", KeyType: "RANGE" }
        ],
        Projection: { ProjectionType: "ALL" },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  }));
}
```

### 2. Migration Script

```typescript
import { DynamoDBClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { migrateAccount, migrateRepository } from "./utils/types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocument.from(client);

async function migrateData() {
  // Migrate accounts
  const accounts = await docClient.send(new ScanCommand({
    TableName: "sc-accounts"
  }));

  for (const account of accounts.Items) {
    const newAccount = migrateAccount(account);
    await docClient.send(new PutCommand({
      TableName: "Accounts_v2",
      Item: newAccount
    }));
  }

  // Migrate repositories
  const repositories = await docClient.send(new ScanCommand({
    TableName: "sc-repositories"
  }));

  for (const repo of repositories.Items) {
    const newRepo = migrateRepository(repo);
    await docClient.send(new PutCommand({
      TableName: "Repositories_v2",
      Item: newRepo
    }));
  }
}
```

### 3. Validation Script

```typescript
import { DynamoDBClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { validateAccount, validateRepository } from "./utils/validation";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocument.from(client);

async function validateMigration() {
  // Validate accounts
  const oldAccounts = await docClient.send(new ScanCommand({
    TableName: "sc-accounts"
  }));

  const newAccounts = await docClient.send(new ScanCommand({
    TableName: "Accounts_v2"
  }));

  // Check counts
  if (oldAccounts.Items.length !== newAccounts.Items.length) {
    throw new Error(`Account count mismatch: ${oldAccounts.Items.length} vs ${newAccounts.Items.length}`);
  }

  // Validate each account
  for (const account of newAccounts.Items) {
    validateAccount(account);
  }

  // Validate repositories
  const oldRepos = await docClient.send(new ScanCommand({
    TableName: "sc-repositories"
  }));

  const newRepos = await docClient.send(new ScanCommand({
    TableName: "Repositories_v2"
  }));

  // Check counts
  if (oldRepos.Items.length !== newRepos.Items.length) {
    throw new Error(`Repository count mismatch: ${oldRepos.Items.length} vs ${newRepos.Items.length}`);
  }

  // Validate each repository
  for (const repo of newRepos.Items) {
    validateRepository(repo);
  }
}
```

### 4. Rollback Script

```typescript
import { DynamoDBClient, DeleteTableCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});

async function rollback() {
  // Delete new tables
  await client.send(new DeleteTableCommand({
    TableName: "Accounts_v2"
  }));

  await client.send(new DeleteTableCommand({
    TableName: "Repositories_v2"
  }));
}
```

## Usage

1. Create new tables:
```bash
npx tsx scripts/migration/create-tables.ts
```

2. Run migration:
```bash
npx tsx scripts/migration/migrate-data.ts
```

3. Validate migration:
```bash
npx tsx scripts/migration/validate.ts
```

4. Rollback if needed:
```bash
npx tsx scripts/migration/rollback.ts
```

## Error Handling

The scripts include comprehensive error handling:
- Table creation failures
- Migration errors
- Validation failures
- Rollback procedures

## Logging

All scripts include detailed logging:
- Progress updates
- Error messages
- Validation results
- Migration statistics

## Testing

Before running in production:
1. Test in local DynamoDB
2. Test in staging environment
3. Verify all validation rules
4. Test rollback procedures 