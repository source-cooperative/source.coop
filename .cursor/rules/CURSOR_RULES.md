# Cursor Rules

## Core Principles

1. **Server-First Architecture**
   - Start with Server Components
   - Convert to Client Components only for:
     - Interactivity
     - Browser APIs
     - React hooks
   - Keep client components as small as possible
   - Move data fetching to server components
   - Use server actions for mutations
   - Always await route parameters in Next.js 15+:
     ```typescript
     // ✅ Correct: Await params before destructuring
     export default async function Page({ params }) {
       const { slug } = await Promise.resolve(params);
       // ...
     }
     
     // ❌ Incorrect: Using params synchronously
     export default function Page({ params }) {
       const { slug } = params; // Error in Next.js 15+
       // ...
     }
     ```

2. **UI/UX Preservation**
   - Never modify existing UI components, layouts, or styling unless explicitly requested
   - When working on backend issues, focus only on backend-related changes
   - If UI changes are needed, they must be:
     - Explicitly requested by the user
     - Limited to the specific component/area mentioned
     - Preserve existing functionality and behavior
     - Maintain current accessibility features
     - Keep existing keyboard shortcuts and navigation
   - Any UI changes must be reversible and maintain the exact same user experience

3. **Trust the Platform**
   - Let Next.js handle routing and errors
   - Let the browser handle native behaviors
   - Let Radix UI manage component states
   - Trust TypeScript types and user data as-is
   - Use built-in Next.js features over custom solutions

4. **Data Integrity**
   - Display data exactly as stored
   - Preserve all path structures
   - Progressive metadata handling
   - Defer to data proxy service
   - Validate data at the source
   - Use type-safe data operations

5. **Efficient Data Fetching**
   - Fetch only the data needed for the current view
   - Use precise queries instead of scanning entire tables
   - Transform data as close to the source as possible
   - Cache transformed data when appropriate
   - Avoid client-side filtering of large datasets
   - Use server-side pagination

## Component Structure

1. **Directory Organization**
   ```
   src/
   ├── app/           # Next.js app router pages
   ├── components/    # React components
   │   ├── core/     # UI primitives
   │   ├── display/  # Formatting
   │   ├── layout/   # Page structure
   │   └── features/ # Domain logic
   ├── lib/          # Utilities and helpers
   └── types/        # TypeScript types
   ```

2. **Component Guidelines**
   - One component per file
   - Co-locate tests
   - Use semantic HTML
   - Prefer `Box` with margins over Flex
   - Keep components focused and single-purpose
   - Use composition over inheritance

3. **Styling**
   - Use Radix UI theme tokens
   - Use CSS variables for colors
   - Single visual state for focus/selection
   - Test both light/dark modes
   - Follow Radix UI component patterns
   - Use consistent spacing and sizing

## Testing Protocol

1. **Pre-Change**
   ```bash
   npm run lint
   next build
   npm run test
   npm run test-pages
   npm run test:perf  # Save baseline
   ```

2. **Test Organization**
   - Group related tests using descriptive `describe` blocks
   - Keep test data close to tests
   - Reset environment using `beforeEach`
   - Use consistent naming for mocks
   - Mock global objects using `Object.defineProperty`
   - Test both initial state and state changes

3. **Component Testing**
   - Mock routing modules at test file level
   - Match text content exactly
   - Test navigation components thoroughly
   - Use specific item matching over array indices
   - Include all production-required fields
   - Test accessibility features
   - Use `renderWithTheme` for themed components

4. **Server Component Testing**
   - Test loading states first
   - Mock server-side data fetching
   - Use `act()` for state updates
   - Test both client and server hydration
   - Handle async operations properly
   - Mock Next.js Request/Response objects
   - Test both success and error paths

5. **Error Testing**
   - Test all error paths
   - Verify error messages
   - Test error recovery flows
   - Mock error conditions consistently
   - Test both client and server errors
   - Use proper error roles and ARIA attributes

## Performance Guidelines

1. **Thresholds**
   ```typescript
   const THRESHOLDS = {
     build: { time: 1500, size: 5000000 },
     pages: {
       home: 3000,
       account: 100,
       repository: 3500,
       objectBrowser: 2000
     }
   };
   ```

2. **Optimization**
   - Use server components for static content
   - Implement proper code splitting
   - Optimize images and assets
   - Use proper caching strategies
   - Monitor bundle sizes
   - Test performance regressions

3. **Large Directories**
   - Progressive loading (depth=1 first)
   - Virtual lists for >20 items
   - Cache structures and paths
   - GPU acceleration for scrolling

## Error Handling

1. **Blocking Issues**
   - Build failures
   - Test failures
   - TypeScript errors
   - 500 errors
   - Hydration issues

2. **Warnings**
   - Performance regressions
   - Console errors
   - Non-critical warnings

## Documentation

1. **Code Comments**
   - Document complex logic
   - Explain non-obvious decisions
   - Keep comments up to date
   - Use JSDoc for public APIs

2. **Type Definitions**
   - Use precise types
   - Document type parameters
   - Keep types DRY
   - Use discriminated unions for complex types

Remember: Never skip testing steps. Trust the platform. Keep changes minimal.


## Account System and Authentication

### 1. Account ID Usage
- Always use `account_id` for:
  - Database queries
  - URL parameters
  - API endpoints
  - Business logic
  - Frontend routing
  - State management

### 2. Ory Integration
- Ory is for authentication only
- Never use Ory IDs for:
  - Database lookups
  - URL parameters
  - API endpoints
  - Business logic
- Store Ory ID only in `metadata_public.ory_id` for reference

### 3. Session Management
- Get `account_id` from session metadata
- Use `account_id` for all operations
- Never rely on Ory ID for access control

### 4. Code Examples

```typescript
// ✅ Correct: Using account_id
const account = await fetchAccount(accountId);
const repositories = await fetchRepositoriesByAccount(accountId);

// ❌ Incorrect: Using Ory ID
const account = await fetchAccountByOryId(oryId);
```

```typescript
// ✅ Correct: URL structure
/{account_id}/repositories
/{account_id}/settings

// ❌ Incorrect: Using Ory ID in URLs
/{ory_id}/repositories
```

### 5. Testing
- Mock Ory responses with `account_id` in metadata
- Test account system independently of auth
- Verify proper separation of concerns 

### 6. Ory Authentication Flow Design
- Always create new authentication flows via API endpoints
- Never try to fetch existing flows directly from Ory (avoids CSRF issues)
- Pass both flow ID and complete flow data from API to client
- Use minimal cookie options when forwarding cookies:
  ```typescript
  const safeOptions = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const
  };
  ```
- Keep cookie handling code simple to avoid `toUTCString` errors
- Add proper error handling and logging for all cookie operations
- Use API routes as proxies for all Ory interactions to handle CSRF correctly 

## Ory Authentication - Simplified Approach

### 1. Direct SDK Usage
- Use Ory SDK directly in client components:
  ```typescript
  const ory = new FrontendApi(
    new Configuration({
      basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000',
      baseOptions: {
        withCredentials: true,
      }
    })
  );
  ```
- Let the SDK handle cookies, CSRF tokens, and form submission
- Avoid custom proxies or middleware for authentication flows

### 2. Form Submission
- **NEVER modify form action URLs**
- Keep original Ory endpoint URLs (http://localhost:4000/...)
- Do not redirect submissions to your Next.js app (http://localhost:3000/...)
- Do not manipulate DOM elements to change form attributes

### 3. Flow Initialization
- Initialize flows directly using the SDK:
  ```typescript
  // Login flow
  ory.createBrowserLoginFlow().then(({ data }) => setFlow(data));
  
  // Registration flow
  ory.createBrowserRegistrationFlow().then(({ data }) => setFlow(data));
  ```
- Initialize flows only when components mount or when needed
- Use proper state management to prevent duplicate initializations

### 4. Session Management
- Use the SDK for session verification:
  ```typescript
  ory.toSession().then(({ data }) => setSession(data));
  ```
- Extract account ID from session metadata as per Account System rules
- Handle authentication errors gracefully with proper redirects

### 5. Next.js Integration
- Always await searchParams in page components:
  ```typescript
  export default async function AuthPage({ 
    searchParams 
  }: {
    searchParams: { flow?: string }
  }) {
    const flow = searchParams.flow;
    // ...
  }
  ```
- Use proper error boundaries for authentication failures
- Keep Ory tunnel running during development

### 6. Authentication Components
- Keep components simple and focused:
  ```typescript
  export function LoginForm() {
    const [flow, setFlow] = useState(null);
    
    useEffect(() => {
      ory.createBrowserLoginFlow()
        .then(({ data }) => setFlow(data))
        .catch(console.error);
    }, []);
    
    if (!flow) return <div>Loading...</div>;
    
    return (
      <div>
        {/* Render form using flow data */}
      </div>
    );
  }
  ```
- Only render the authentication form when flow data is available
- Handle errors and loading states appropriately 