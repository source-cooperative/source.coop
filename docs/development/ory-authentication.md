# Ory Authentication Implementation

This document describes how Source Cooperative implements authentication using Ory Kratos, following a server-first architecture that minimizes client-side auth checks.

## Architecture Overview

Source Cooperative uses Ory Kratos for identity management and authentication. Our implementation:

1. Uses server-side auth checks by default
2. Minimizes client-side auth checks
3. Follows Next.js 13+ best practices
4. Maintains proper CORS and cookie handling

## Core Implementation Principles

1. **Server-Side Auth Checks**: We check authentication status on the server:
   ```typescript
   // In server components
   import { requireServerAuth } from '@/lib/auth';
   
   export default async function ProtectedPage() {
     const session = await requireServerAuth();
     if (!session) {
       redirect('/auth?flow=login');
     }
     // ... render protected content
   }
   ```

2. **Client-Side Auth Hook**: Use the `useAuth` hook only when necessary:
   ```typescript
   // In client components that need auth state
   import { useAuth } from '@/hooks/useAuth';
   
   export function AuthAwareComponent() {
     const { session, isLoading } = useAuth();
     if (isLoading) return <Loading />;
     if (!session) return <LoginPrompt />;
     return <AuthenticatedContent />;
   }
   ```

3. **Flow Initialization**: Authentication flows are initialized via server actions:
   ```typescript
   // Server action
   export async function initLoginFlow() {
     const flowId = await getLoginFlow();
     return flowId;
   }
   
   // Client component
   export function LoginForm() {
     const [flowId, setFlowId] = useState<string | null>(null);
     
     useEffect(() => {
       initLoginFlow().then(setFlowId);
     }, []);
     
     if (!flowId) return <Loading />;
     return <LoginFormContent flowId={flowId} />;
   }
   ```

4. **Form Submission**: Forms submit directly to Ory endpoints:
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

## Key Requirements

1. **Server-First Architecture**:
   - Check auth status on the server by default
   - Use client-side auth checks only when necessary
   - Keep client components as small as possible
   - Move data fetching to server components

2. **CORS Configuration**:
   - Ory tunnel must be configured with proper CORS settings
   - Use `--allowed-cors-origins="http://localhost:3000"` in development
   - Ensure `withCredentials: true` in SDK configuration

3. **Cookie Handling**:
   - Use consistent domains (always `localhost`, never `127.0.0.1`)
   - Ensure browser allows third-party cookies
   - Cookie settings are handled automatically by the SDK

4. **CSRF Protection**:
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

1. **Duplicate Auth Checks**:
   - **Problem**: Multiple 401 errors in console
   - **Solution**: Use server-side auth checks by default
   - **Fix**: Move auth checks to server components:
     ```typescript
     // ✅ Correct: Server-side auth check
     export default async function Page() {
       const session = await requireServerAuth();
       if (!session) redirect('/auth');
       return <Content />;
     }
     
     // ❌ Incorrect: Client-side auth check
     export default function Page() {
       const { session } = useAuth();
       if (!session) return <LoginPrompt />;
       return <Content />;
     }
     ```

2. **Cookie Issues**:
   - Use `localhost` consistently
   - Enable third-party cookies in browser
   - Check cookie settings in Ory configuration

3. **Session API Implementation**:
   - Use server-side session checks:
     ```typescript
     // Server-side session check
     export async function getServerSession() {
       try {
         const cookieStore = cookies();
         const { data } = await ory.toSession({
           cookie: cookieStore.toString()
         });
         return data;
       } catch (error) {
         // 401 is expected for non-logged in users
         if (error instanceof Error && error.message.includes('401')) {
           return null;
         }
         throw error;
       }
     }
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