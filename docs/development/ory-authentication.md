# Ory Authentication Implementation

This document describes how Source Cooperative implements authentication using Ory Kratos, including solutions to common challenges like CSRF token handling.

## Architecture Overview

Source Cooperative uses Ory Kratos for identity management and authentication. Our implementation:

1. Uses the Ory tunnel in development (`ory tunnel http://localhost:3000 --project [project-id]`)
2. Implements custom login and registration flows
3. Uses direct Ory SDK calls for all authentication operations

## Simplified Authentication Approach

Our authentication implementation follows these principles:

1. **Direct SDK Usage**: We use the Ory SDK directly in client components:
   ```typescript
   const ory = new FrontendApi(
     new Configuration({
       basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000',
       baseOptions: { withCredentials: true }
     })
   );
   ```

2. **Form Submission**: We keep original Ory endpoint URLs:
   - Never modify form action URLs from localhost:4000 to localhost:3000
   - Submit forms directly to Ory endpoints
   - Include CSRF tokens from the flow data

3. **Flow Initialization**: Authentication flows are initialized directly with the SDK:
   ```typescript
   // Login flow initialization
   ory.createBrowserLoginFlow().then(({ data }) => setFlow(data));
   
   // Registration flow initialization
   ory.createBrowserRegistrationFlow().then(({ data }) => setFlow(data));
   ```

4. **Session Management**: We use the SDK for session verification:
   ```typescript
   ory.toSession().then(({ data }) => setSession(data));
   ```

## Implementation Details

### Form Components

Login and registration forms are implemented as client components:
- `src/components/features/auth/LoginForm.tsx`
- `src/components/features/auth/RegistrationForm.tsx`

These forms:
1. Initialize flows on component mount
2. Display proper loading and error states
3. Submit directly to Ory endpoints without URL modification

### Auth Page Component

The main auth page (`src/app/auth/page.tsx`) is a server component that:
1. Properly awaits search parameters (required in Next.js 15+)
2. Checks if the user is already authenticated
3. Renders the appropriate authentication tab (login or register)

## Common Issues and Solutions

1. **Registration Form Not Working**
   - Symptom: Form submission redirects to localhost:3000 instead of localhost:4000
   - Solution: Make sure forms submit to original Ory endpoint URLs (localhost:4000)

2. **CSRF Errors**
   - Symptom: "CSRF token missing" errors in the console
   - Solution: Ensure CSRF tokens are properly included from the flow data

3. **Cookie Issues**
   - Be consistent with domain usage (use either localhost or 127.0.0.1, not both)
   - Ensure cookies from Ory responses are properly forwarded

## Testing Notes

When testing authentication:
1. Make sure the Ory tunnel is running (`npm run dev:tunnel`)
2. Use consistent domains (always `localhost`, not `127.0.0.1`)
3. Ensure browser allows third-party cookies

## References

- [Ory Kratos Documentation](https://www.ory.sh/docs/kratos)
- [Ory CSRF Troubleshooting](https://www.ory.sh/docs/kratos/debug/csrf)
- [Ory React Integration](https://www.ory.sh/docs/getting-started/integrate-auth/react) 