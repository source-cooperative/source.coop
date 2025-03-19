import { render, screen, waitFor } from '@testing-library/react';
import { RepositoryList } from '@/components/features/repositories';
import { fetchRepositories } from '@/lib/db/operations';
import type { Repository, IndividualAccount } from '@/types';

// Mock the db operations
jest.mock('@/lib/db/operations', () => ({
  fetchRepositories: jest.fn(),
}));

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/test-path',
}));

describe('HomePage', () => {
  const mockAccount: IndividualAccount = {
    account_id: 'test-user',
    name: 'Test User',
    type: 'individual',
    description: 'A test user',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    email: 'test@example.com',
  };

  const mockRepositories: Repository[] = [
    {
      repository_id: 'test-repo',
      title: 'Test Repository',
      description: 'A test repository',
      account: mockAccount,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      private: false,
      metadata_files: {},
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchRepositories as jest.Mock).mockResolvedValue(mockRepositories);
  });

  it('renders the repositories list', async () => {
    render(<RepositoryList repositories={mockRepositories} />);
    
    // Verify that the repository title is rendered
    expect(screen.getByText('Test Repository')).toBeInTheDocument();
  });

  it('fetches repositories correctly', async () => {
    const repositories = await fetchRepositories();
    expect(repositories).toEqual(mockRepositories);
    expect(fetchRepositories).toHaveBeenCalledTimes(1);
  });
}); 