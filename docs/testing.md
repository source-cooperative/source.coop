# Testing Guidelines

## Test Organization

1. **Component Tests**
   - Place component tests in a `__tests__` directory next to the component
   - Name test files with `.test.tsx` extension for React components
   - Example: `src/components/features/markdown/MarkdownViewer.tsx` → `src/components/features/markdown/__tests__/MarkdownViewer.test.tsx`

2. **Test Fixtures**
   - Store test data in `tests/fixtures`
   - Use descriptive names for fixture files (e.g., `example-data.ts`, `example-accounts.ts`)
   - Keep fixtures focused and well-documented

3. **Integration Tests**
   - Place integration tests in `tests/integration`
   - Group by feature area (e.g., `tests/integration/storage`, `tests/integration/auth`)

4. **Unit Tests for Utilities**
   - Place utility tests next to the utility file in a `__tests__` directory
   - Example: `src/utils/format.ts` → `src/utils/__tests__/format.test.ts`

## Testing Best Practices

1. **Component Testing**
   - Test rendering with different props
   - Test user interactions
   - Test error states
   - Use meaningful test descriptions
   - Group related tests in describe blocks

2. **Test Data**
   - Use fixtures for complex test data
   - Keep test data minimal and focused
   - Document the purpose of test data

3. **Error Handling**
   - Test error cases explicitly
   - Verify error messages and states
   - Test boundary conditions

4. **Async Testing**
   - Use proper async/await patterns
   - Test loading states
   - Test error states in async operations

## Tools and Setup

1. **Required Dependencies**
   ```json
   {
     "@testing-library/react": "latest",
     "@testing-library/jest-dom": "latest",
     "@types/jest": "latest",
     "jest": "latest",
     "jest-environment-jsdom": "latest"
   }
   ```

2. **Running Tests**
   - Use `npm test` for running all tests
   - Use `npm test -- --watch` for development
   - Use `npm test -- --coverage` for coverage reports 