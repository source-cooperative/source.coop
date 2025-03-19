# Coding Standards

## Core Principles

### 1. UI/UX Preservation
- Never modify existing UI components, layouts, or styling unless explicitly requested
- When working on backend issues, focus only on backend-related changes
- If UI changes are needed, they must be:
  - Explicitly requested by the user
  - Limited to the specific component/area mentioned
  - Preserve existing functionality and behavior
  - Maintain current accessibility features
  - Keep existing keyboard shortcuts and navigation
- Any UI changes must be reversible and maintain the exact same user experience

### 2. Trust the Platform
- Let Next.js handle routing and errors
- Let the browser handle native behaviors
- Let Radix UI manage component states
- Trust TypeScript types and user data as-is

### 3. Server-First Architecture
- Start with Server Components
- Convert to Client Components only for:
  - Interactivity
  - Browser APIs
  - React hooks

### 4. Data Integrity
- Display data exactly as stored
- Preserve all path structures
- Progressive metadata handling
- Defer to data proxy service

### 5. Efficient Data Fetching
- Fetch only the data needed for the current view
- Use precise queries instead of scanning entire tables
- Transform data as close to the source as possible
- Cache transformed data when appropriate
- Avoid client-side filtering of large datasets

### 6. Type-Safe Data Operations
- Use precise types for all data operations
- Handle type narrowing with const assertions
- Transform data with type safety in mind
- Avoid type assertions unless absolutely necessary
- Use discriminated unions for complex types

Example:
```typescript
// Good: Type-safe account handling
const account = accountType === 'organization' 
  ? {
      ...baseAccount,
      type: 'organization' as const,
      owner_account_id: string,
      admin_account_ids: string[]
    }
  : {
      ...baseAccount,
      type: 'individual' as const,
      email: string,
      orcid?: string
    };
```

## Component Structure

```
src/components/
├── core/      # UI primitives
├── display/   # Formatting
├── layout/    # Page structure
└── features/  # Domain logic
```

### Guidelines
- One component per file
- Co-locate tests
- Use semantic HTML
- Prefer `Box` with margins over Flex

## Styling Guidelines

### Radix UI Usage
- Use Radix UI theme tokens
- Use CSS variables for colors
- Single visual state for focus/selection
- Test both light/dark modes

### Component Patterns
- Use `Text` component with `as="p"` for paragraphs
- Use `color="red"` for error states
- Use `color="gray"` for secondary text
- Use `Box` with margins for layout
- Use `Button` with `variant="solid"` for primary actions
- Use `variant="ghost"` for secondary actions

## Page Component Guidelines

### Best Practices
- Keep page components simple and focused
- Use synchronous params when possible
- Fetch data with precise queries
- Transform data at the source

Example:
```typescript
// Good: Simple, focused page component
export default async function AccountPage({ params }: PageProps) {
  const account = await fetchAccount(params.account_id);
  if (!account) notFound();
  
  const repositories = await fetchRepositoriesByAccount(params.account_id);
  
  return <AccountProfile account={account} repositories={repositories} />;
}
```

## Testing Guidelines

### Component Testing
- Mock routing modules at test file level
- Match text content exactly, including punctuation
- Test both file and directory paths
- Verify exact router URLs
- Test empty states and edge cases
- Use specific item matching over array indices
- Include all production-required fields in test data

### Server Component Testing
- Always test loading states first
- Mock server-side data fetching
- Use `act()` for state updates
- Test both client and server hydration
- Handle async operations properly
- Mock Next.js Request/Response objects
- Test both success and error paths
- Verify correct status codes
- Test edge cases (invalid data, missing fields)
- Mock external services consistently

### Error Testing
- Test all error paths
- Verify error messages are displayed
- Test error recovery flows
- Mock error conditions consistently
- Test both client and server errors
- Use proper error roles and ARIA attributes
- Test error state transitions
- Verify error logging
- Test error boundary behavior

## Performance Guidelines

### Large Directories
- Progressive loading (depth=1 first)
- Virtual lists for >20 items
- Cache structures and paths
- GPU acceleration for scrolling

### Components
- Memoize expensive computations
- Cache state for transitions
- Handle SSR differences
- Progressive data loading

### Error Handling
BLOCKING:
- Build failures
- Test failures
- TypeScript errors
- 500 errors
- Hydration issues

WARNING:
- Performance regressions
- Console errors
- Non-critical warnings

Remember: Never skip testing steps. Trust the platform. Keep changes minimal. 