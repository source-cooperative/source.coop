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