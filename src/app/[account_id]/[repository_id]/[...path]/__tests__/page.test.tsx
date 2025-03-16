import RepositoryPathPage from '../page';
import { notFound } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn()
}));

// Mock storage client
jest.mock('@/lib/clients/storage', () => ({
  createStorageClient: () => ({
    listObjects: jest.fn().mockResolvedValue([
      { path: 'daily', type: 'directory' },
      { path: 'daily/data.txt', type: 'file' },
      { path: 'monthly/data.csv', type: 'file' }
    ])
  })
}));

// Mock repository data
jest.mock('@/lib/db/operations', () => ({
  fetchRepositories: jest.fn().mockResolvedValue([
    {
      account: { account_id: 'noaa', name: 'NOAA' },
      repository_id: 'ghcn',
      name: 'GHCN'
    }
  ])
}));

describe('RepositoryPathPage', () => {
  it('renders root directory without 404', async () => {
    await RepositoryPathPage({
      params: {
        account_id: 'noaa',
        repository_id: 'ghcn',
        path: []
      }
    });
    expect(notFound).not.toHaveBeenCalled();
  });

  it('renders subdirectory without 404', async () => {
    await RepositoryPathPage({
      params: {
        account_id: 'noaa',
        repository_id: 'ghcn',
        path: ['daily']
      }
    });
    expect(notFound).not.toHaveBeenCalled();
  });

  it('renders file without 404', async () => {
    await RepositoryPathPage({
      params: {
        account_id: 'noaa',
        repository_id: 'ghcn',
        path: ['daily', 'data.txt']
      }
    });
    expect(notFound).not.toHaveBeenCalled();
  });

  it('returns 404 for non-existent path', async () => {
    await RepositoryPathPage({
      params: {
        account_id: 'noaa',
        repository_id: 'ghcn',
        path: ['nonexistent']
      }
    });
    expect(notFound).toHaveBeenCalled();
  });
}); 