# Test Data Structure

This document describes the test data structure used for local development and testing.

## Overview

The test data consists of a combination of DynamoDB tables and a local file storage structure that mirrors the production environment. This setup allows for realistic testing of the application's features without requiring external services.

## DynamoDB Tables

### Accounts Table
- Contains both individual user accounts and organization accounts
- Primary key: `id` (string)
- Attributes:
  - `type`: "individual" or "organization"
  - `name`: Display name
  - `email`: Contact email
  - `description`: Account description
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

### Repositories Table
- Stores repository metadata and relationships
- Primary key: `id` (string)
- Global Secondary Index: `account_id` (string)
- Attributes:
  - `name`: Repository name
  - `account_id`: Owner's account ID
  - `description`: Repository description
  - `visibility`: "public" or "private"
  - `created_at`: Timestamp
  - `updated_at`: Timestamp

## Test Storage Structure

The test storage is organized in a hierarchical structure that mirrors the repository ownership:

```
test-storage/
├── individual_users/
│   ├── sarah/
│   │   ├── arctic-sea-ice/
│   │   └── climate-analytics/
│   ├── michael/
│   │   ├── open-geo-tools/
│   │   └── vector-tile-renderer/
│   └── ...
├── organizations/
│   ├── nasa/
│   │   └── nasa-repo-1/
│   ├── noaa/
│   │   └── noaa-repo-1/
│   └── ...
└── ...
```

## Test Data Generation

The test data is generated and initialized using the `init-local.ts` script, which:

1. Creates necessary DynamoDB tables if they don't exist
2. Generates test accounts (individual users and organizations)
3. Creates test repositories with realistic metadata
4. Sets up the corresponding directory structure in test storage
5. Initializes repository content with README files

## Usage

To initialize the test environment:

```bash
npx tsx scripts/init-local.ts
```

This will:
- Set up DynamoDB tables
- Create test accounts and repositories
- Generate the test storage structure
- Populate repository content

## Test Data Relationships

The test data includes various relationships to test different scenarios:

1. Individual Users
   - Personal repositories
   - Organization memberships
   - Repository access levels

2. Organizations
   - Team repositories
   - Member relationships
   - Repository ownership

3. Repositories
   - Public and private visibility
   - Different types of content
   - Various metadata configurations

## Maintenance

When adding new features or modifying existing ones:

1. Update the test data structure in `init-local.ts`
2. Add new test cases to the storage structure
3. Update this documentation to reflect changes
4. Ensure the test data covers all relevant scenarios

## Best Practices

1. Keep test data realistic but minimal
2. Use consistent naming conventions
3. Include a variety of edge cases
4. Document any special test scenarios
5. Maintain the relationship between DynamoDB and storage data 