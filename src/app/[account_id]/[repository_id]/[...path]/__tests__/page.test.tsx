import { render, screen, waitFor } from '@testing-library/react'
import type { Repository, RepositoryObject } from '@/types'

// Define custom error type for notFound
interface NotFoundError extends Error {
  digest: string;
}

// Mock next/navigation first
jest.mock('next/navigation', () => ({
  notFound: jest.fn().mockImplementation(() => {
    const error = new Error('NEXT_NOT_FOUND') as NotFoundError;
    error.digest = 'NEXT_NOT_FOUND';
    throw error;
  }),
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/test-path',
    searchParams: new URLSearchParams()
  }),
  usePathname: () => '/test-path'
}))

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

const mockObjects: RepositoryObject[] = [
  {
    id: 'stac-collection-json',
    repository_id: 'landsat-collection',
    path: 'stac/collection.json',
    size: 1024,
    type: 'file',
    mime_type: 'application/json',
    checksum: 'sha256:1234567890',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'data-dir',
    repository_id: 'landsat-collection',
    path: 'data/',
    size: 0,
    type: 'directory',
    checksum: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

// Mock database functions
jest.mock('@/lib/db', () => ({
  fetchRepository: jest.fn().mockImplementation((account_id, repository_id) => {
    if (repository_id === 'invalid-repo') {
      return Promise.resolve(null)
    }
    return Promise.resolve(mockRepository)
  })
}))

// Mock storage client
jest.mock('@/lib/clients/storage', () => ({
  createStorageClient: jest.fn().mockImplementation(() => ({
    listObjects: jest.fn().mockResolvedValue({
      objects: mockObjects
    })
  }))
}))

// Import the page component after all mocks are set up
const RepositoryPathPage = require('@/app/[account_id]/[repository_id]/[...path]/page').default

describe('RepositoryPathPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders root directory without 404', async () => {
    const params = {
      account_id: 'nasa',
      repository_id: 'landsat-collection',
      path: []
    }
    
    const page = await RepositoryPathPage({ params })
    render(page)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    expect(screen.getByText('Landsat Collection')).toBeInTheDocument()
    expect(screen.getByText('Collection of Landsat satellite imagery')).toBeInTheDocument()
  })

  it('renders subdirectory without 404', async () => {
    const params = {
      account_id: 'nasa',
      repository_id: 'landsat-collection',
      path: ['data']
    }
    
    const page = await RepositoryPathPage({ params })
    render(page)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    expect(screen.getByText('data')).toBeInTheDocument()
  })

  it('renders file without 404', async () => {
    const params = {
      account_id: 'nasa',
      repository_id: 'landsat-collection',
      path: ['stac', 'collection.json']
    }
    
    const page = await RepositoryPathPage({ params })
    render(page)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    expect(screen.getByText('collection.json', { selector: 'span[data-item="name"]' })).toBeInTheDocument()
  })

  it('returns 404 for non-existent path', async () => {
    const params = {
      account_id: 'nasa',
      repository_id: 'invalid-repo',
      path: []
    }
    
    const { notFound } = require('next/navigation')
    await expect(RepositoryPathPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
  })
}) 