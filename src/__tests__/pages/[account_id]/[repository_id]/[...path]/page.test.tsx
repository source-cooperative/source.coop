import { render, screen } from '@testing-library/react'
import type { Repository } from '@/types'

// Mock next/navigation first
const mockNotFound = jest.fn().mockImplementation(() => {
  const error = new Error('NEXT_NOT_FOUND')
  error.digest = 'NEXT_NOT_FOUND'
  throw error
})

jest.mock('next/navigation', () => ({
  notFound: mockNotFound,
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/test-path',
    searchParams: new URLSearchParams()
  }),
  usePathname: () => '/test-path'
}), { virtual: true })

// Define mock data
const mockRepository: Repository = {
  repository_id: 'landsat-collection',
  title: 'Landsat Collection',
  description: 'Collection of Landsat satellite imagery',
  private: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  account: {
    account_id: 'nasa',
    name: 'NASA',
    type: 'organization',
    owner_account_id: 'nasa',
    admin_account_ids: ['nasa'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

const mockObjects = [
  {
    path: 'stac/collection.json',
    size: 1024,
    type: 'file',
    mime_type: 'application/json',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    path: 'data/',
    type: 'directory',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

// Mock database functions
const mockFetchRepository = jest.fn().mockImplementation((account_id, repository_id) => {
  if (repository_id === 'invalid-repo') {
    return Promise.resolve(null)
  }
  return Promise.resolve(mockRepository)
})

jest.mock('@/lib/db', () => ({
  fetchRepository: mockFetchRepository
}), { virtual: true })

// Mock storage client
jest.mock('@/lib/clients/storage', () => ({
  createStorageClient: jest.fn().mockImplementation(() => ({
    listObjects: jest.fn().mockResolvedValue({
      objects: mockObjects
    })
  }))
}), { virtual: true })

// Import the page component after all mocks are set up
const RepositoryPathPage = require('@/app/[account_id]/[repository_id]/[...path]/page').default

describe('RepositoryPathPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('handles storage errors gracefully', async () => {
    const params = {
      account_id: 'nasa',
      repository_id: 'landsat-collection',
      path: []
    }

    // Mock storage client to throw an error
    const mockStorageClient = require('@/lib/clients/storage')
    mockStorageClient.createStorageClient.mockImplementationOnce(() => ({
      listObjects: jest.fn().mockRejectedValueOnce(new Error('Failed to load objects'))
    }))
    
    const page = await RepositoryPathPage({ params })
    render(page)
    
    // Wait for error message to appear
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Failed to load objects')
  })

  it('handles invalid repository', async () => {
    const params = {
      account_id: 'nasa',
      repository_id: 'invalid-repo',
      path: []
    }
    
    // Ensure notFound is called when repository is null
    await expect(RepositoryPathPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })
})