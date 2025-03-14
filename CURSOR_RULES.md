# Cursor Rules

## Layout & Component Structure

1. **Page Layout**
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