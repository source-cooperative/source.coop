# Test Data Setup

This document describes how test data is managed in the Source Cooperative project.

## Overview

The project uses a structured approach to manage test data for local development:

1. Test data files are stored in the `test-storage` directory
2. A script (`scripts/setup-test-data.ts`) reads this structure and populates DynamoDB
3. The setup process is automated through npm scripts

## Directory Structure

The `test-storage` directory follows this structure:

```
test-storage/
├── account_id_1/
│   ├── repository_id_1/
│   │   └── stac/
│   │       └── catalog.json
│   └── repository_id_2/
│       └── stac/
│           └── catalog.json
└── account_id_2/
    └── repository_id_3/
        └── stac/
            └── catalog.json
```

## Setup Process

### 1. Initialize Local Environment

Run the local setup script to start DynamoDB and create tables:

```bash
npm run init-local
```

This script will:
1. Start DynamoDB Local in Docker
2. Create the necessary tables (Accounts and Repositories)
3. Load test data from the test-storage directory

### 2. Test Data Generation

The `setup-test-data.ts` script:

1. Reads the test-storage directory structure
2. Creates accounts based on top-level directories
3. Creates repositories based on subdirectories containing STAC catalogs
4. Generates appropriate metadata and relationships
5. Populates DynamoDB with the generated data

### 3. Manual Test Data Updates

To update test data:

1. Add or modify files in the `test-storage` directory
2. Run the setup script to regenerate DynamoDB data:

```bash
npm run setup-test-data
```

## Data Model

### Accounts

Each account in the test data includes:
- `account_id`: Derived from the directory name
- `ory_id`: Generated unique identifier
- `name`: Formatted from the account_id
- `type`: Set to 'organization' for test accounts
- `owner_account_id`: Set to 'admin'
- `admin_account_ids`: Includes 'admin'
- `created_at` and `updated_at`: Timestamps

### Repositories

Each repository includes:
- `repository_id`: Derived from the directory name
- `account`: Reference to the parent account
- `title`: Formatted from the repository_id
- `description`: Generated description
- `private`: Set to false
- `metadata_files`: Includes STAC catalog reference
- `created_at` and `updated_at`: Timestamps

## Best Practices

1. Keep test data minimal and focused on testing specific features
2. Use meaningful names for accounts and repositories
3. Include necessary STAC catalogs for repository testing
4. Document any special test data requirements in this file

## Troubleshooting

If you encounter issues with test data:

1. Check that DynamoDB Local is running:
```bash
docker ps | grep dynamodb-local
```

2. Verify table creation:
```bash
aws dynamodb list-tables --endpoint-url http://localhost:8000
```

3. Check data counts:
```bash
aws dynamodb scan --endpoint-url http://localhost:8000 --table-name Accounts --select COUNT
aws dynamodb scan --endpoint-url http://localhost:8000 --table-name Repositories --select COUNT
```

4. If needed, restart the setup process:
```bash
npm run init-local
``` 