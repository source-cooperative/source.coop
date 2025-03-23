# Ory Authentication Implementation

This document describes how Source Cooperative implements authentication using Ory Kratos, following a simplified and direct approach that avoids common pitfalls.

## Architecture Overview

Source Cooperative uses Ory Kratos for identity management and authentication. Our implementation:

1. Uses direct SDK calls from client components
2. Avoids custom middleware or routing complexity
3. Maintains proper CORS and cookie handling
4. Follows Ory's recommended best practices

## Core Implementation Principles

1. **Direct SDK Usage**: We use the Ory SDK directly in client components:
   ```typescript
   const ory = new FrontendApi(
     new Configuration({
       basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000',
       baseOptions: {
         withCredentials: true,
         headers: {
           Accept: "application/json"
         }
       }
     })
   );
   ```

2. **Flow Initialization**: Authentication flows are initialized directly using the SDK without extra parameters:
   ```typescript
   // Login flow initialization - keep it simple
   const { data } = await ory.createBrowserLoginFlow();
   setFlow(data);
   
   // Registration flow initialization - keep it simple
   const { data } = await ory.createBrowserRegistrationFlow();
   setFlow(data);
   ```

3. **Form Submission**: Forms submit directly to Ory endpoints:
   ```typescript
   await ory.updateLoginFlow({
     flow: flow.id,
     updateLoginFlowBody: {
       method: 'password',
       identifier: identifier,
       password: password,
       csrf_token: csrfToken,
     },
   });
   ```

4. **Session Handling**: Get session information directly from Ory:
   ```typescript
   try {
     const { data: session } = await ory.toSession();
     // Handle session data
   } catch (err) {
     // No active session or error
   }
   ```

## Key Requirements

1. **CORS Configuration**:
   - Ory tunnel must be configured with proper CORS settings
   - Use `--allowed-cors-origins="http://localhost:3000"` in development
   - Ensure `withCredentials: true` in SDK configuration

2. **Cookie Handling**:
   - Use consistent domains (always `localhost`, never `127.0.0.1`)
   - Ensure browser allows third-party cookies
   - Cookie settings are handled automatically by the SDK

3. **CSRF Protection**:
   - CSRF tokens are included automatically in flow data
   - Extract and include tokens in form submissions
   - No manual CSRF handling required

## Development Setup

1. **Environment Variables**:
   ```env
   NEXT_PUBLIC_ORY_SDK_URL=http://localhost:4000
   NEXT_PUBLIC_KRATOS_URL=http://localhost:4000
   ORY_BASE_URL=http://localhost:4000
   ORY_PROJECT_ID=your-project-id
   ```

2. **Ory Tunnel**:
   ```bash
   ory tunnel --dev --debug \
     --allowed-cors-origins="http://localhost:3000" \
     http://localhost:3000 \
     --project your-project-id
   ```

## Common Issues and Solutions

1. **400 Bad Request Errors**:
   - **Solution**: Initialize flows without extra parameters like `returnTo`
   - **Problem**: Adding extra parameters can cause validation errors
   - **Fix**: Use simple flow initialization:
     ```typescript
     // ✅ Correct: Simple initialization
     const { data } = await ory.createBrowserLoginFlow();
     
     // ❌ Incorrect: Extra parameters that may cause errors
     const { data } = await ory.createBrowserLoginFlow({
       returnTo: '/onboarding'
     });
     ```

2. **Cookie Issues**:
   - Use `localhost` consistently
   - Enable third-party cookies in browser
   - Check cookie settings in Ory configuration

3. **Session API Implementation**:
   - Use direct forwarding of cookies in API routes:
     ```typescript
     // Forward cookies to Ory
     const cookieHeader = request.headers.get('cookie') || '';
     
     // Make a direct request to Ory with cookies
     const sessionResponse = await fetch(`${ORY_BASE_URL}/sessions/whoami`, {
       headers: {
         Cookie: cookieHeader,
         Accept: 'application/json',
       },
     });
     ```

## Testing Authentication

1. Start the development environment:
   ```bash
   npm run dev
   ```

2. Run the Ory tunnel in a separate terminal:
   ```bash
   npx @ory/cli tunnel --dev http://localhost:3000
   ```

3. Verify tunnel logs show proper CORS headers:
   ```
   Access-Control-Allow-Credentials:[true]
   Access-Control-Allow-Origin:[http://localhost:3000]
   ```

4. Monitor network requests for proper flow:
   ```
   GET [/self-service/login/browser] => 200
   POST [/self-service/login?flow=<id>] => 200
   GET [/sessions/whoami] => 200
   ```

## References

- [Ory Kratos Documentation](https://www.ory.sh/docs/kratos)
- [Ory SDK Reference](https://www.ory.sh/docs/reference/api)
- [CORS Configuration Guide](https://www.ory.sh/docs/ecosystem/configuring-cors) 