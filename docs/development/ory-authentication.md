# Ory Authentication Implementation

Source Cooperative uses Ory Kratos for authentication, following a server-first architecture with minimal client-side auth.


## Local Development Setup

1. **Environment Variables** (in `.env.local`):
```env
# Ory project configuration
NEXT_PUBLIC_ORY_SDK_URL=your-project-api-url
NEXT_PUBLIC_LOCAL_ORY_SDK_URL=http://localhost:3000
ORY_PROJECT_API_KEY=your-access-token
```

## Core Principles

1. **Server-First Authentication**
   - Always check auth on the server first
   - Use client-side auth only when necessary
   - Keep auth-aware client components minimal

2. **Identity Management**
   - Use `account_id` for all business logic and URLs
   - Store `account_id` in Ory's `metadata_public`
   - Never use Ory IDs for application logic

3. **Local Development**
   - Always use `localhost` (never `127.0.0.1`)
   - Keep Ory tunnel running during development
   - Ensure browser allows third-party cookies

## Registration Flow

The registration process follows these steps:

1. **Initial Registration**
   ```ts
   // Initialize the registration flow
   const { data } = await ory.createBrowserRegistrationFlow();
   ```

2. **Email Verification**
   - User submits registration form
   - Ory sends verification email
   - User clicks verification link
   - Ory verifies email and redirects based on configuration

3. **Post-Verification**
   - User is redirected to configured return URL
   - Complete profile setup
   - Set up account details

Note: Return URLs for registration and verification should be configured in your Ory project settings, not passed in the flow initialization.

## Redirect Configuration

Source Cooperative configures Ory redirects to handle authentication flows appropriately. These redirects are configured in the Ory Console under Project Settings > Redirects.

### Global Settings
- **Default Redirect URL**: `/` (homepage)
- **Allowed URLs**: 
  ```
  http://localhost:3000    # Development
  https://your-domain.com  # Production
  ```

### Flow-Specific Redirects
- **Post-Login**: `/` (homepage)
- **Post-Registration**: `/onboarding`
- **Post-Verification**: `/email-verified`
- **Post-Logout**: (uses global default)
- **Post-Settings**: (uses global default)
- **Post-Recovery**: (uses global default)

The `/email-verified` page handles both registration and verification completions by:
1. Verifying the user's session
2. Updating the verification timestamp in metadata
3. Redirecting to either:
   - `/{accountId}?verified=true` for existing accounts
   - `/onboarding?verified=true` for new registrations

Note: All redirect URLs should be relative paths. Ory will combine them with the allowed domains to prevent open redirect vulnerabilities.

## Code Examples

### Server-Side Auth (Preferred)
```typescript
// In server components
import { requireServerAuth } from '@/lib/auth';

export default async function ProtectedPage() {
  const session = await requireServerAuth();
  if (!session) {
    redirect('/auth?flow=login');
  }
  return <ProtectedContent />;
}
```

### Client-Side Auth (When Needed)
```typescript
// In client components
import { useAuth } from '@/hooks/useAuth';

export function AuthAwareComponent() {
  const { session, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!session) return <LoginPrompt />;
  return <AuthenticatedContent />;
}
```

### Form Submission
```typescript
// Let the SDK handle all auth flows
import { ory } from '@/lib/ory';

// Submit directly to Ory
await ory.updateLoginFlow({
  flow: flow.id,
  updateLoginFlowBody: {
    method: 'password',
    identifier,
    password,
    csrf_token: flow.csrf_token,
  },
});
```

## Important Rules

1. **Never**:
   - Use Ory IDs in URLs or business logic
   - Modify form action URLs
   - Create custom auth proxies
   - Store sensitive data in client state

2. **Always**:
   - Use server components for auth checks
   - Let the SDK handle CSRF and cookies
   - Use `account_id` for application logic
   - Follow the server-first pattern

3. **Auth Flow**:
   - Initialize flows via SDK
   - Submit forms directly to Ory
   - Handle redirects properly
   - Check auth status server-side

## Troubleshooting

1. **401 Errors**
   - Expected for non-authenticated users
   - Only log unexpected auth errors
   - Check API token if admin operations fail

2. **Cookie Issues**
   - Verify using `localhost`
   - Check third-party cookie settings
   - Ensure tunnel is running
   - Verify CORS configuration

3. **Email Verification**
   - Configure SMTP settings in Ory
   - Test with development email server
   - Check verification flow configuration

## References

- [Ory Kratos Documentation](https://www.ory.sh/docs/kratos)
- [Ory SDK Reference](https://www.ory.sh/docs/reference/api)
- [CORS Configuration Guide](https://www.ory.sh/docs/ecosystem/configuring-cors) 