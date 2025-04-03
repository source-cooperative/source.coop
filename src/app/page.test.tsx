import { render, screen } from '@testing-library/react';
import { fetchRepositories } from '@/lib/db/operations_v2';
import HomePage from './page';
import { Repository_v2 } from '@/types/repository_v2';

// Mock the db operations
jest.mock('@/lib/db/operations_v2', () => ({
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
  const mockRepositories: Repository_v2[] = [
    {
      account_id: 'test-account',
      repository_id: 'test-repo',
      title: 'Test Repository',
      description: 'A test repository',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      visibility: 'public',
      metadata: {
        mirrors: {},
        primary_mirror: '',
        tags: [],
        roles: {}
      },
      mirrors: [],
      roles: []
    }
  ];

  beforeEach(() => {
    (fetchRepositories as jest.Mock).mockResolvedValue({ repositories: mockRepositories });
  });

  it('renders repositories list', async () => {
    render(await HomePage());
    
    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('Test Repository')).toBeInTheDocument();
  });
}); 