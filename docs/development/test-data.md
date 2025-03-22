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

# Test Account Management

This guide explains how to manage test accounts during development, including creation and cleanup.

## Creating Test Accounts

### Through the UI
1. Visit `http://localhost:3000/register`
2. Fill in the registration form with test data
3. Verify your email using the link sent to your inbox

### Using the API
```bash
# Register a new test account
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-account@example.com",
    "password": "test-password123"
  }'
```

## Deleting Test Accounts

### Prerequisites
Before deleting an account, ensure you have:
1. A valid session (logged in)
2. CSRF token
3. Account ID of the account to delete

### Methods

#### 1. Using curl
```bash
# 1. Get session and CSRF token
curl -X GET http://localhost:3000/api/auth/session --cookie-jar cookies.txt

# 2. Delete the account
curl -X DELETE http://localhost:3000/api/accounts/your-account-id \
  --cookie cookies.txt \
  -H "x-csrf-token: YOUR_CSRF_TOKEN"
```

#### 2. Using Browser Console
```javascript
// Get CSRF token
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('csrf_token'))
  ?.split('=')[1];

// Delete account
await fetch('/api/accounts/your-account-id', {
  method: 'DELETE',
  headers: {
    'x-csrf-token': csrfToken
  },
  credentials: 'include'
});
```

#### 3. Using a Test Script
Create a file `scripts/cleanup-test-accounts.ts`:

```typescript
import { getSession } from '@/lib/auth';

async function cleanupTestAccounts() {
  // Get your session
  const session = await getSession();
  if (!session) {
    console.error('No valid session found');
    return;
  }

  // Get list of test accounts
  const response = await fetch('/api/accounts', {
    headers: {
      'x-csrf-token': session.csrf_token
    },
    credentials: 'include'
  });

  const accounts = await response.json();

  // Delete test accounts
  for (const account of accounts) {
    if (account.email.includes('test-') || account.email.includes('@example.com')) {
      console.log(`Deleting test account: ${account.account_id}`);
      
      await fetch(`/api/accounts/${account.account_id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': session.csrf_token
        },
        credentials: 'include'
      });
    }
  }
}

cleanupTestAccounts().catch(console.error);
```

### Expected Responses

#### Success
```json
{
  "success": true,
  "message": "Account deleted successfully",
  "deleted_by": "self"
}
```

#### Common Errors
```json
// No session
{ "error": "Unauthorized" }

// Missing CSRF token
{ "error": "CSRF token missing" }

// Wrong account
{ "error": "You can only delete your own account" }

// Account not found
{ "error": "Account not found" }
```

## Best Practices

1. **Naming Convention**
   - Use a consistent prefix for test accounts (e.g., `test-`)
   - Use `@example.com` domain for test emails
   - Include timestamp or unique identifier in account names

2. **Cleanup**
   - Delete test accounts after each test session
   - Use the cleanup script to remove all test accounts
   - Keep track of created test accounts

3. **Security**
   - Never use real email addresses for test accounts
   - Use strong but predictable passwords for test accounts
   - Don't store test credentials in version control

4. **Testing Scenarios**
   - Test account deletion with different permission levels
   - Test deletion of accounts with associated data
   - Test concurrent deletion attempts

## Troubleshooting

### Common Issues

1. **Session Expired**
   ```bash
   # Clear cookies and log in again
   curl -X GET http://localhost:3000/api/auth/session --cookie-jar cookies.txt
   ```

2. **CSRF Token Missing**
   - Ensure you're logged in
   - Get a fresh CSRF token
   - Include the token in the request header

3. **Account Not Found**
   - Verify the account ID
   - Check if the account exists in DynamoDB
   - Ensure you have the correct permissions

### Debugging Steps

1. Check session status:
   ```bash
   curl -X GET http://localhost:3000/api/auth/session
   ```

2. Verify account existence:
   ```bash
   curl -X GET http://localhost:3000/api/accounts/your-account-id
   ```

3. Check server logs for detailed error messages

## Related Documentation

- [API Testing Guide](api-testing.md)
- [Authentication Guide](ory-authentication.md)
- [DynamoDB Guide](dynamodb.md) 