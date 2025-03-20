# Ory Authentication Implementation

This document describes how Source Cooperative implements authentication using Ory Kratos, including solutions to common challenges like CSRF token handling.

## Architecture Overview

Source Cooperative uses Ory Kratos for identity management and authentication. Our implementation:

1. Uses the Ory tunnel in development (`ory tunnel http://localhost:3000 --project [project-id]`)
2. Implements custom login and registration flows
3. Manages cookies and CSRF tokens through API routes

## Authentication Flow Design

Our authentication flow follows these principles:

1. **Create new flows for each request**: Always create new authentication flows instead of fetching existing ones
2. **Use API routes as proxies**: All Ory interactions go through our API routes to handle CSRF correctly
3. **Pass complete data**: API routes return both flow ID and complete flow data to minimize client-side requests
4. **Simplified cookie handling**: Use minimal, safe cookie options to avoid errors

## CSRF Issue Solution

We encountered persistent CSRF violations with messages like:

```
The anti-CSRF cookie was found but the CSRF token was not included in the HTTP request body (csrf_token) nor in the HTTP Header (X-CSRF-Token).
```

Our solution:

1. Instead of fetching existing flows (which requires exact CSRF token matches), we create new flows for each request
2. API routes handle cookie forwarding with simplified options:

```typescript
// Safe cookie options to avoid toUTCString errors
const safeOptions = {
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const
};

// Set cookies with error handling
try {
  jsonResponse.cookies.set(name, value, safeOptions);
} catch (err) {
  console.error(`Failed to set cookie ${name}:`, err);
}
```

3. Authentication flow helper functions (`getLoginFlow`, `getRegistrationFlow`) always create new flows via API endpoints

## Implementation Details

### API Routes

1. `/api/auth/login` and `/api/auth/register` create new flows and return flow data
2. These routes handle cookie forwarding with simplified options
3. They add cache control headers to prevent stale responses

### Client-Side Components

1. Auth forms use flow data directly from API responses
2. No direct interaction with Ory endpoints from client components
3. All requests include credentials to ensure cookies are sent

## Debugging Tips

If authentication issues occur:

1. Clear browser cookies for your domain
2. Check browser console for CSRF errors 
3. Verify Ory tunnel is running correctly
4. Ensure consistent use of either `localhost` or `127.0.0.1` (don't mix them)
5. Check API route logs for cookie processing errors
6. Verify that cookies are being forwarded correctly

## References

- [Ory Kratos Documentation](https://www.ory.sh/docs/kratos)
- [Ory CSRF Troubleshooting](https://www.ory.sh/docs/kratos/debug/csrf) 