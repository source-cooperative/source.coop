# Testing Guidelines

This document outlines the testing strategy and requirements for Source.coop.

## Test Data Strategy

### Development Environment Data
All tests should use the actual data from the development environment to ensure consistency and reliability:

1. **Local DynamoDB Data**
   - Use the same DynamoDB instance as the development environment
   - Test against real account and repository data
   - Maintain data consistency across development and testing

2. **Local File Storage**
   - Use data from `./test-storage` directory
   - Test with actual repository contents
   - Available test accounts and repositories:

     #### Organizations
     - `esa/` - European Space Agency
     - `nasa/` - National Aeronautics and Space Administration
     - `noaa/` - National Oceanic and Atmospheric Administration
     - `usgs/` - United States Geological Survey
     - `ecmwf/` - European Centre for Medium-Range Weather Forecasts
     - `planetary-computer/` - Microsoft Planetary Computer
     - `usda/` - United States Department of Agriculture
     - `radiant/` - Radiant Earth Foundation
     - `microsoft/` - Microsoft Corporation

     #### Individual Accounts
     - `jed/` - Individual developer account
     - `sarah/` - Individual researcher account
     - `alex/` - Individual data scientist account
     - `maria/` - Individual analyst account
     - `david/` - Individual developer account

## Testing Strategy

### 1. Component Testing
- Test components with real data from development environment
- Verify component behavior matches production expectations
- Test all interactive elements and user flows
- Ensure accessibility compliance
- Test both success and error states

### 2. Integration Testing
- Test component interactions with real services
- Verify data flow through the application
- Test API endpoints with actual data
- Ensure proper error handling
- Validate data transformations

### 3. End-to-End Testing
- Test complete user workflows
- Verify critical paths with real data
- Test error recovery flows
- Validate user interactions
- Ensure proper state management

### 4. Performance Testing
- Monitor component render times
- Track API response times
- Measure data loading performance
- Test with large datasets
- Verify caching behavior

## Test Requirements

### Coverage Requirements
- Minimum 80% code coverage
- 100% coverage for critical paths
- 100% coverage for authentication flows
- 100% coverage for data operations
- All tests must use development environment data

### Performance Thresholds
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

## Standardized Test Patterns

### 1. Page Component Tests
```typescript
// __tests__/pages/[account_id]/[repository_id]/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { RepositoryPage } from '@/app/[account_id]/[repository_id]/page'
import { storageClient } from '@/lib/storage'

describe('RepositoryPage', () => {
  // Standard test data setup
  const TEST_ACCOUNT = 'nasa'
  const TEST_REPOSITORY = 'landsat-collection'
  
  beforeEach(async () => {
    // Ensure we have valid test data
    const repository = await storageClient.getRepository({
      account_id: TEST_ACCOUNT,
      repository_id: TEST_REPOSITORY
    })
    expect(repository).toBeDefined()
  })

  it('renders repository contents', async () => {
    render(<RepositoryPage params={{ 
      account_id: TEST_ACCOUNT, 
      repository_id: TEST_REPOSITORY 
    }} />)
    
    // Wait for loading state to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Verify core content
    expect(screen.getByText('Repository Contents')).toBeInTheDocument()
  })

  it('handles errors gracefully', async () => {
    // Test error state with invalid repository
    render(<RepositoryPage params={{ 
      account_id: TEST_ACCOUNT, 
      repository_id: 'invalid-repo' 
    }} />)
    
    await waitFor(() => {
      expect(screen.getByText('Repository not found')).toBeInTheDocument()
    })
  })
})
```

### 2. Component Tests
```typescript
// __tests__/components/repository/ObjectBrowser.test.tsx
import { render, screen } from '@testing-library/react'
import { ObjectBrowser } from '@/components/repository/ObjectBrowser'
import { storageClient } from '@/lib/storage'

describe('ObjectBrowser', () => {
  const TEST_ACCOUNT = 'nasa'
  const TEST_REPOSITORY = 'landsat-collection'
  
  it('displays repository contents', async () => {
    // Get actual repository data
    const repository = await storageClient.getRepository({
      account_id: TEST_ACCOUNT,
      repository_id: TEST_REPOSITORY
    })
    
    // Get actual repository contents
    const contents = await storageClient.listObjects({
      account_id: TEST_ACCOUNT,
      repository_id: TEST_REPOSITORY,
      object_path: ''
    })
    
    render(<ObjectBrowser 
      repository={repository}
      contents={contents}
      currentPath=""
    />)
    
    // Verify content display
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('handles empty directories', async () => {
    const repository = await storageClient.getRepository({
      account_id: TEST_ACCOUNT,
      repository_id: TEST_REPOSITORY
    })
    
    render(<ObjectBrowser 
      repository={repository}
      contents={[]}
      currentPath="empty-dir"
    />)
    
    expect(screen.getByText('No contents found')).toBeInTheDocument()
  })
})
```

### 3. API Route Tests
```typescript
// __tests__/api/repositories/[account_id]/[repository_id]/route.test.ts
import { NextRequest } from 'next/server'
import { GET } from './route'
import { storageClient } from '@/lib/storage'

describe('GET /api/repositories/[account_id]/[repository_id]', () => {
  const TEST_ACCOUNT = 'nasa'
  const TEST_REPOSITORY = 'landsat-collection'
  
  it('returns repository data', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/repositories/${TEST_ACCOUNT}/${TEST_REPOSITORY}`
    )
    
    const response = await GET(request, {
      params: {
        account_id: TEST_ACCOUNT,
        repository_id: TEST_REPOSITORY
      }
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.id).toBe(TEST_REPOSITORY)
  })

  it('handles invalid repository', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/repositories/${TEST_ACCOUNT}/invalid-repo`
    )
    
    const response = await GET(request, {
      params: {
        account_id: TEST_ACCOUNT,
        repository_id: 'invalid-repo'
      }
    })
    
    expect(response.status).toBe(404)
  })
})
```

## Test Utilities

### 1. Common Test Data
```typescript
// __tests__/utils/test-data.ts
export const TEST_DATA = {
  organizations: {
    esa: {
      id: 'esa',
      name: 'European Space Agency',
      type: 'organization',
      repositories: ['sentinel-2', 'sentinel-3']
    },
    // ... other organizations
  },
  individuals: {
    jed: {
      id: 'jed',
      name: 'Jed Sundwall',
      type: 'individual',
      repositories: ['personal-projects', 'research-data']
    },
    // ... other individuals
  },
  paths: {
    root: '',
    stac: 'stac',
    metadata: 'metadata.json',
    collection: 'collection.json'
  }
} as const

// Helper functions for test data access
export type AccountType = 'organization' | 'individual'
export type AccountId = keyof typeof TEST_DATA.organizations | keyof typeof TEST_DATA.individuals

export async function getTestRepository(accountId: AccountId, repoId: string) {
  return await storageClient.getRepository({
    account_id: accountId,
    repository_id: repoId
  })
}

export async function getTestContents(accountId: AccountId, repoId: string, path: string = '') {
  return await storageClient.listObjects({
    account_id: accountId,
    repository_id: repoId,
    object_path: path
  })
}
```

### 2. Test Helpers
```typescript
// __tests__/utils/test-helpers.ts
import { render } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { storageClient } from '@/lib/storage'

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  )
}

export async function waitForLoadingToComplete() {
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })
}

export function expectRepositoryContent() {
  expect(screen.getByText('Repository Contents')).toBeInTheDocument()
}
```

## Best Practices

1. **Test Organization**
   - Group related tests using descriptive `describe` blocks
   - Use consistent test data from development environment
   - Reset environment using `beforeEach`
   - Test both success and error states
   - Verify component behavior matches production

2. **Data Usage**
   - Always use development environment data
   - Maintain data consistency
   - Document data dependencies
   - Handle data cleanup properly
   - Use common test data utilities

3. **Error Handling and Mocking**
   - Define custom error types for expected errors:
     ```typescript
     // Define error types before mocking
     interface NotFoundError extends Error {
       digest: string;
     }
     
     // Use type assertion when creating errors
     const error = new Error('NEXT_NOT_FOUND') as NotFoundError;
     error.digest = 'NEXT_NOT_FOUND';
     ```
   - Set up mocks before importing tested modules:
     ```typescript
     // 1. Mock external dependencies first
     jest.mock('next/navigation', () => ({
       notFound: mockNotFound,
       useRouter: () => ({...})
     }))
     
     // 2. Define mock data
     const mockRepository = {...}
     
     // 3. Mock internal services
     jest.mock('@/lib/db', () => ({
       fetchRepository: jest.fn()
     }))
     
     // 4. Import the component under test LAST
     const TestedComponent = require('@/path/to/component')
     ```
   - Reset mocks between tests:
     ```typescript
     beforeEach(() => {
       jest.clearAllMocks()
       jest.resetModules() // If needed
     })
     ```
   - Test error states explicitly:
     ```typescript
     it('handles errors gracefully', async () => {
       // Mock error condition
       mockService.mockRejectedValueOnce(new Error('Test error'))
       
       // Render and wait for error state
       render(<Component />)
       await waitFor(() => {
         expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
       })
       
       // Verify error display
       const alert = await screen.findByRole('alert')
       expect(alert).toHaveTextContent('Test error')
     })
     ```
   - Verify error handling behavior:
     ```typescript
     it('handles not found errors', async () => {
       // Expect the notFound function to be called
       await expect(Component({ params }))
         .rejects.toThrow('NEXT_NOT_FOUND')
       expect(mockNotFound).toHaveBeenCalled()
     })
     ```

4. **Loading States**
   - Always test loading state transitions:
     ```typescript
     it('handles loading state', async () => {
       render(<Component />)
       
       // Verify loading state
       expect(screen.getByText('Loading...')).toBeInTheDocument()
       
       // Wait for loading to complete
       await waitFor(() => {
         expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
       })
       
       // Verify loaded content
       expect(screen.getByText('Expected Content')).toBeInTheDocument()
     })
     ```
   - Use `waitFor` consistently for async operations
   - Test both loading and loaded states
   - Verify loading indicators are removed
   - Handle race conditions in tests

5. **Assertions**
   - Test one concept per test
   - Use specific assertions
   - Avoid implementation details
   - Verify against real data
   - Use helper functions for common checks

## Common Issues

1. **Data Consistency**
   - Ensure development data is available
   - Handle missing data gracefully
   - Document data requirements
   - Clean up test artifacts
   - Use standardized test data

2. **Flaky Tests**
   - Use `waitFor` for async operations
   - Handle data race conditions
   - Clean up test state
   - Use helper functions for async operations
   - Verify data availability

3. **Mock Setup Issues**
   - Set up mocks in correct order (external first, component import last)
   - Define custom error types for expected errors
   - Reset mocks between tests
   - Mock all required dependencies
   - Verify mock behavior

4. **Error Handling**
   - Test all error states
   - Verify error messages
   - Check error boundaries
   - Test recovery flows
   - Document error scenarios

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Documentation](https://testing-library.com/docs/)
- [Next.js Testing Guide](https://nextjs.org/docs/testing) 