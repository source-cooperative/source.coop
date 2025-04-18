# Account System and Authentication

## Overview
Source.coop uses a hybrid authentication and account management system:
- **Ory Kratos**: Handles user authentication (login, registration, password management)
- **Source.coop Account System**: Manages user profiles, organizations, and permissions

## Core Principles

### 1. Separation of Concerns
- **Ory Kratos**: Authentication only
  - User credentials
  - Session management
  - Password reset
  - Email verification
  - No business logic or profile data

- **Source.coop Account System**: Business logic and profiles
  - User profiles
  - Organization management
  - Product ownership
  - Permissions and access control

### 2. Account ID System
- Each user has a unique `account_id` in our system
- `account_id` is:
  - Human-readable (e.g., "jed", "nasa")
  - URL-friendly
  - Used in all internal references
  - Independent of authentication system

### 3. Ory Integration
- Ory ID is stored in `metadata_public.ory_id` for reference only
- Never use Ory ID for:
  - Database lookups
  - URL parameters
  - API endpoints
  - Business logic

## Implementation

### 1. User Registration Flow
1. User registers through Ory
2. On successful registration:
   - Create Source.coop account with `account_id`
   - Store `account_id` in Ory's `metadata_public`
   - Redirect to onboarding

### 2. Session Management
```typescript
// Check session and get account_id
const response = await fetch('/api/auth/session');
if (response.ok) {
  const data = await response.json();
  const accountId = data.identity.metadata_public?.account_id;
  if (accountId) {
    // Use accountId for all operations
    const account = await fetchAccount(accountId);
  }
}
```

### 3. Database Operations
```typescript
// Always use account_id for lookups
const account = await fetchAccount(accountId);
const products = await fetchProductsByAccount(accountId);
```

### 4. URL Structure
```
/{account_id}                    // Account profile
/{account_id}/edit              // Account settings
/{account_id}/organization/new  // Create organization
/{account_id}/{product_id}   // Product view
```

## Best Practices

### 1. Data Access
- Always use `account_id` for database queries
- Never query by Ory ID
- Store Ory ID only for reference

### 2. API Design
- Use `account_id` in all API endpoints
- Keep Ory integration internal to auth system
- Never expose Ory IDs in API responses

### 3. Frontend Development
- Use `account_id` for routing and navigation
- Store `account_id` in user state
- Never reference Ory IDs in UI

### 4. Testing
- Mock Ory responses with `account_id` in metadata
- Test account system independently of auth
- Verify proper separation of concerns

## Security Considerations

### 1. Access Control
- Validate `account_id` ownership
- Check organization membership
- Verify product access

### 2. Session Security
- Rely on Ory for session validation
- Use `account_id` for business logic
- Never trust Ory ID for access control

### 3. Data Protection
- Keep Ory credentials secure
- Store minimal Ory data
- Use Source.coop types for all operations

## Migration and Maintenance

### 1. Account Creation
- Generate unique `account_id`
- Create Source.coop account
- Update Ory metadata
- Handle conflicts gracefully

### 2. Account Updates
- Update Source.coop data first
- Sync with Ory if needed
- Maintain data consistency

### 3. Account Deletion
- Remove Source.coop data
- Clean up Ory metadata
- Handle cascading deletions 