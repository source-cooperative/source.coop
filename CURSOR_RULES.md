# Cursor Rules

## Layout & Component Structure

1. **Page Layout**
   - Follow the Simple Page Rule:
     1. URL params are known values (e.g. `/[account_id]/[repository_id]`)
     2. Get data -> Transform if needed -> Render
     3. Trust your types, avoid complex validation
     4. Let Next.js handle errors (404, 500, etc.)
     5. No helper functions unless truly needed
   - Avoid using Flex containers for top-level page layout when components need to maintain fixed positions
   - Use `Box` components with explicit margins for vertical stacking instead of flex-based gaps
   - Example:
   ```tsx
   <Container>
     <Box>
       <Header />
     </Box>
     <Box mt="4">
       <Content />
     </Box>
   </Container>
   ```
   - Layout should be responsive, with containers taking up 100% width on small displays.

2. **Component Organization**
   - Keep related components in dedicated directories (e.g., `/components/repositories/`)
   - Use index files to export components from their directories
   - Maintain consistent file naming: `ComponentName.tsx`

3. **Navigation & Routing**
   - Use Next.js App Router conventions
   - Keep route-specific components in their respective route directories
   - Example: `/app/[account_id]/[repository_id]/page.tsx`

## Styling Conventions

1. **Radix UI Theme Usage**
   - Use Radix UI's theme tokens for spacing, colors, and typography
   - Prefer theme props over inline styles when possible
   - Example: `mt="4"` instead of `style={{ marginTop: '16px' }}`

2. **Dark Mode Compatibility**
   - Use CSS variables for colors (e.g., `var(--gray-5)`)
   - Test all components in both light and dark modes

## Component Patterns

1. **Data Display**
   - Use `Card` components for containing related information
   - Include clear section headers with `SectionHeader` component
   - Maintain consistent spacing between elements

2. **Interactive Elements**
   - Use `Link` components for navigation
   - Implement hover states consistently
   - Provide clear visual feedback for interactive elements

## File Structure

1. **Component Files**
   - One component per file (except for small related components)
   - Export components as named exports
   - Include relevant interfaces/types in the same file

2. **Type Definitions**
   - Keep shared types in `/types` directory
   - Use consistent naming: `ComponentNameProps` for prop interfaces

## Best Practices

1. **Error Handling**
   - Implement proper error boundaries
   - Provide meaningful error messages
   - Include fallback UI for error states

2. **Performance**
   - Use client components only when necessary
   - Implement proper loading states
   - Optimize images and assets

3. **Accessibility**
   - Include proper ARIA labels
   - Maintain keyboard navigation support
   - Ensure proper color contrast 

4. **Browser Behavior**
   - Never override standard browser behaviors unless absolutely necessary
   - Preserve text selection and copy/paste functionality
   - Keyboard shortcuts should not interfere with browser defaults
   - If adding keyboard shortcuts:
     - Only trigger on exact matches (check for modifiers)
     - Ignore when focus is in input fields
     - Don't override common shortcuts (Ctrl/Cmd+C, Ctrl/Cmd+V, etc.)
     - Provide clear documentation and visual indicators
   - Example: For custom copy functionality, add a "Copy" button instead of overriding Ctrl/Cmd+C

5. **Server Component First**
   - Always start with a Server Component by default
   - Only convert to a Client Component when there is a clear need for client-side functionality (e.g., interactivity, browser APIs, React hooks)
   - When client-side functionality is needed:
     - First try to isolate the client-side code into the smallest possible Client Component
     - Keep the parent/wrapper as a Server Component if possible
     - Never use 'use client' just to resolve dependency errors - instead, restructure the component to better separate server/client concerns
   - Components using server-only packages (like Bright) MUST remain Server Components

6. **Path and Directory Handling**
   - Display paths exactly as they exist in the object store
   - Never attempt to normalize or deduplicate directory names
   - Trust that users know their own data structure
   - Remember that our role is to faithfully represent the object store's contents
   - Treat paths as opaque strings that happen to use '/' as a delimiter
   - Example: If a user has a path like 'docs/specs/docs/api.md', display it exactly as is

7. **Object Metadata Handling**
   - Focus on metadata display, not content delivery
   - Build metadata progressively:
     1. Use basic info from object listing (path, size, suffix)
     2. Enhance with object store tags where available
     3. Further enhance with HEAD request metadata
   - Defer actual file access to dedicated data proxy service
   - Optimize for large repositories:
     - Avoid downloading file contents in browser
     - Use HEAD requests to gather additional metadata
     - Cache metadata where appropriate
   - Display all available metadata clearly:
     - File attributes (size, type, timestamps)
     - Object store tags
     - Content-related headers
     - Checksums and verification status

## Component Organization

### Directory Structure 

src/components/
├── core/ # Fundamental UI building blocks
│ ├── MonoText.tsx # Typography components
│ ├── LinkCard.tsx # Interactive elements
│ ├── SectionHeader.tsx # Layout primitives
│ └── index.ts
├── display/ # Formatting and presentation
│ ├── DateText.tsx # Data formatting
│ ├── BreadcrumbNav.tsx # Navigation elements
│ └── index.ts
├── layout/ # Page structure
│ ├── Footer.tsx # Site-wide layout components
│ ├── Logo.tsx
│ ├── Navigation.tsx
│ └── index.ts
└── features/ # Domain-specific features
├── markdown/ # Markdown processing
├── metadata/ # Metadata handling
├── profiles/ # User/org profiles
├── repositories/ # Repository features
└── index.ts

### Component Categories

1. **Core Components** (`core/`)
   - Basic building blocks of the UI
   - Must be completely domain-agnostic
   - Should be highly reusable
   ```typescript
   // Example: core/MonoText.tsx
   export function MonoText(props: TextProps) {
     return <Text {...props} style={{ fontFamily: 'var(--code-font-family)' }} />;
   }
   ```

2. **Display Components** (`display/`)
   - Handle data presentation and formatting
   - Focus on visual representation
   ```typescript
   // Example: display/DateText.tsx
   export function DateText({ date, includeTime }: DateTextProps) {
     return <Text>{formatDate(date, { includeTime })}</Text>;
   }
   ```

3. **Layout Components** (`layout/`)
   - Handle page structure
   - Manage site-wide presentation
   ```typescript
   // Example: layout/Navigation.tsx
   export function Navigation() {
     return (
       <Container>
         <Flex align="center" justify="between">
           <Logo />
         </Flex>
       </Container>
     );
   }
   ```

4. **Feature Components** (`features/`)
   - Implement domain-specific functionality
   - Can contain business logic
   - Organized by feature area
   ```typescript
   // Example: features/repositories/ObjectBrowser.tsx
   export function ObjectBrowser({ repository, objects }: ObjectBrowserProps) {
     // Repository-specific functionality
   }
   ```

## Import Guidelines

1. **Direct Imports**
   ```typescript
   // Preferred
   import { MonoText } from '@/components/core';
   import { DateText } from '@/components/display';
   import { ObjectBrowser } from '@/components/features/repositories';
   
   // Avoid
   import { MonoText, DateText } from '@/components';
   ```

2. **Index Files**
   ```typescript
   // components/core/index.ts
   export { MonoText } from './MonoText';
   export { LinkCard } from './LinkCard';
   ```

## Component Patterns

1. **Props and Types**
   ```typescript
   interface ComponentProps {
     // Required props first
     title: string;
     // Optional props last
     className?: string;
   }
   
   export function Component({ title, className = '' }: ComponentProps) {
     // Implementation
   }
   ```

2. **Client Components**
   - Mark with 'use client' only when needed
   - Keep client-side logic focused
   ```typescript
   'use client';
   
   export function InteractiveComponent() {
     const [state, setState] = useState();
     // Client-side logic
   }
   ```

3. **Theme Usage**
   - Use Radix UI theme tokens
   - Use CSS variables for colors
   ```typescript
   <Box style={{ 
     borderColor: 'var(--gray-5)',
     padding: 'var(--space-4)'
   }} />
   ```

## File Organization

1. **Component Files**
   - One component per file
   - Match filename to component name
   - Group related components in feature directories

2. **Imports Order**
   ```typescript
   // External dependencies
   import { Component } from 'external-lib';
   
   // Internal components
   import { CoreComponent } from '@/components/core';
   
   // Types and utilities
   import type { ComponentProps } from '@/types';
   import { utility } from '@/utils';
   ```

## Testing

1. **Test Files**
   - Co-locate with components
   - Match component file names
   ```
   MonoText.tsx
   MonoText.test.tsx
   ```

## Documentation

1. **Component Comments**
   ```typescript
   /**
    * Displays text in monospace font
    * @param props.size - Text size variant
    * @param props.color - Theme color token
    */
   export function MonoText({ size, color }: MonoTextProps) {
   ```

2. **Props Documentation**
   ```typescript
   interface ComponentProps {
     /** The main title text */
     title: string;
     /** Optional CSS class name */
     className?: string;
   }
   ```

