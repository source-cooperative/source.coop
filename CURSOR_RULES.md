# Cursor Rules

## Core Principles

1. **Trust the Platform**
   - Let Next.js handle routing and errors
   - Let the browser handle native behaviors
   - Let Radix UI manage component states
   - Trust TypeScript types and user data as-is

2. **Server-First Architecture**
   - Start with Server Components
   - Convert to Client Components only for:
     - Interactivity
     - Browser APIs
     - React hooks

3. **Data Integrity**
   - Display data exactly as stored
   - Preserve all path structures
   - Progressive metadata handling
   - Defer to data proxy service

## Implementation

1. **Component Structure**
   ```
   src/components/
   ├── core/      # UI primitives
   ├── display/   # Formatting
   ├── layout/    # Page structure
   └── features/  # Domain logic
   ```
   - One component per file
   - Co-locate tests
   - Use semantic HTML
   - Prefer `Box` with margins over Flex

2. **Styling**
   - Use Radix UI theme tokens
   - Use CSS variables for colors
   - Single visual state for focus/selection
   - Test both light/dark modes

3. **Performance**
   Thresholds:
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
   - Keep test data close to tests (in test file or dedicated fixtures)
   - Reset environment using `beforeEach`
   - Use consistent naming for mocks (e.g. `mockRouter`, `mockRepository`)
   - Mock global objects using `Object.defineProperty`
   - For stateful components, verify both initial state and state changes

3. **Component Testing**
   - Mock routing modules (e.g. `next/navigation`) at test file level
   - Match text content exactly, including punctuation
   - For navigation components:
     - Test both file and directory paths
     - Verify exact router URLs
     - Test empty states and edge cases
   - Use specific item matching over array indices
   - Include all production-required fields in test data

4. **Keyboard Testing**
   - Attach event listeners to `document`, not `window`
   - Clear mocks before each test with `jest.clearAllMocks()`
   - Test both single-key ('j', 'k', '?') and multi-key sequences
   - Verify modifier key handling (ctrl, meta, alt, shift)
   - Mock `navigator.clipboard` for clipboard operations
   - Test navigation boundaries and edge cases

5. **During Change**
   - Make ONE focused change
   - Run affected tests
   - Check build status
   - Verify critical paths:
     - Homepage
     - Account pages
     - Repository pages
     - Object browser
     - Search
     - Keyboard shortcuts

6. **Post-Change**
   - Run full test suite
   - Compare with baseline
   - Document changes:
   ```json
   {
     "change": {
       "description": "",
       "files": [],
       "type": ""
     },
     "testing": {
       "preMetrics": {},
       "postMetrics": {},
       "verifiedPaths": []
     }
   }
   ```

## Optimization Guidelines

1. **Large Directories**
   - Progressive loading (depth=1 first)
   - Virtual lists for >20 items
   - Cache structures and paths
   - GPU acceleration for scrolling

2. **Components**
   - Memoize expensive computations
   - Cache state for transitions
   - Handle SSR differences
   - Progressive data loading

3. **Error Handling**
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