import { render, screen, fireEvent } from '@testing-library/react';
import { RepositoryList } from '../RepositoryList';
import type { Repository_v2 } from '@/types/repository_v2';
import type { Account } from '@/types/account_v2';

// Mock next/navigation
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
};

const mockPathname = jest.fn().mockReturnValue('/');

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname(),
}));

describe('RepositoryList', () => {
  const mockAccount: Account = {
    account_id: 'test-account',
    type: 'individual',
    name: 'Test User',
    emails: [{
      address: 'test@example.com',
      verified: true,
      is_primary: true,
      added_at: '2024-03-14T00:00:00Z'
    }],
    created_at: '2024-03-14T00:00:00Z',
    updated_at: '2024-03-14T00:00:00Z',
    disabled: false,
    flags: [],
    metadata_public: {},
    metadata_private: {
      identity_id: 'test-identity'
    }
  };

  const mockRepositories: Repository_v2[] = [
    {
      repository_id: 'repo1',
      account_id: 'test-account',
      title: 'Repository 1',
      description: 'Test repository 1',
      visibility: 'public',
      created_at: '2024-03-14T00:00:00Z',
      updated_at: '2024-03-14T00:00:00Z',
      metadata: {
        mirrors: {},
        primary_mirror: '',
        roles: {}
      }
    },
    {
      repository_id: 'repo2',
      account_id: 'test-account',
      title: 'Repository 2',
      description: 'Test repository 2',
      visibility: 'public',
      created_at: '2024-03-14T00:00:00Z',
      updated_at: '2024-03-14T00:00:00Z',
      metadata: {
        mirrors: {},
        primary_mirror: '',
        roles: {}
      }
    }
  ];

  beforeEach(() => {
    mockRouter.push.mockClear();
    mockPathname.mockReturnValue('/');
  });

  it('renders repository list', () => {
    render(<RepositoryList repositories={mockRepositories} />);
    expect(screen.getByText('Repository 1')).toBeInTheDocument();
    expect(screen.getByText('Repository 2')).toBeInTheDocument();
  });

  describe('keyboard navigation', () => {
    it('navigates with j/k keys', () => {
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Press j to select first repository
      fireEvent.keyDown(document, { key: 'j' });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'true');
      
      // Press j again to select second repository
      fireEvent.keyDown(document, { key: 'j' });
      expect(screen.getByText('Repository 2').closest('a')).toHaveAttribute('data-selected', 'true');
      
      // Press k to go back to first repository
      fireEvent.keyDown(document, { key: 'k' });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'true');
    });

    it('navigates with arrow keys', () => {
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Press ArrowDown to select first repository
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'true');
      
      // Press ArrowUp to go back
      fireEvent.keyDown(document, { key: 'ArrowUp' });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'true');
    });

    it('respects navigation boundaries', () => {
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Try to navigate up when no selection
      fireEvent.keyDown(document, { key: 'ArrowUp' });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'true');
      
      // Try to navigate up at first item
      fireEvent.keyDown(document, { key: 'ArrowUp' });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'true');
      
      // Navigate to last item
      fireEvent.keyDown(document, { key: 'j' });
      expect(screen.getByText('Repository 2').closest('a')).toHaveAttribute('data-selected', 'true');
      
      // Try to navigate past last item
      fireEvent.keyDown(document, { key: 'j' });
      expect(screen.getByText('Repository 2').closest('a')).toHaveAttribute('data-selected', 'true');
    });

    it('opens repository with Enter or o key', () => {
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Select first repository
      fireEvent.keyDown(document, { key: 'j' });
      
      // Press Enter
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(mockRouter.push).toHaveBeenCalledWith('/test-account/repo1');
      
      mockRouter.push.mockClear();
      
      // Press o key
      fireEvent.keyDown(document, { key: 'o' });
      expect(mockRouter.push).toHaveBeenCalledWith('/test-account/repo1');
    });

    it('clears selection with Escape', () => {
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Select first repository
      fireEvent.keyDown(document, { key: 'j' });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'true');
      
      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'false');
    });

    it('ignores keyboard shortcuts when input is focused', () => {
      render(
        <>
          <input type="text" data-testid="test-input" />
          <RepositoryList repositories={mockRepositories} />
        </>
      );
      
      // Focus input
      const input = screen.getByTestId('test-input');
      input.focus();
      
      // Try navigation
      fireEvent.keyDown(input, { key: 'j' });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'false');
    });

    it('ignores keyboard shortcuts with modifier keys (except ?)', () => {
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Try Ctrl+j
      fireEvent.keyDown(document, { key: 'j', ctrlKey: true });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'false');
      
      // Try Meta+k
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      expect(screen.getByText('Repository 1').closest('a')).toHaveAttribute('data-selected', 'false');
      
      // ? should work with shift
      fireEvent.keyDown(document, { key: '?', shiftKey: true });
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-describedby');
      expect(screen.getByText(/Keyboard shortcuts for repository list/)).toBeInTheDocument();
    });
  });

  it('shows help dialog on ? key', () => {
    render(<RepositoryList repositories={mockRepositories} />);
    
    // Press ? key
    fireEvent.keyDown(document, { key: '?' });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-describedby');
    expect(screen.getByRole('heading', { name: /keyboard shortcuts/i })).toBeInTheDocument();
    expect(screen.getByText('Show/hide this help dialog')).toBeInTheDocument();
    expect(screen.getByText(/Keyboard shortcuts for repository list/)).toBeInTheDocument();
  });

  describe('path navigation', () => {
    it('navigates to home on backtick from repository page', () => {
      // Mock being on a repository page
      mockPathname.mockReturnValue('/test-account/repo1');
      
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Press backtick key
      fireEvent.keyDown(document, { key: '`' });
      expect(mockRouter.push).toHaveBeenCalledWith('/test-account');
    });

    it('navigates to root from profile page', () => {
      // Mock being on a profile page
      mockPathname.mockReturnValue('/test-account');
      
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Press backtick key
      fireEvent.keyDown(document, { key: '`' });
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });

    it('navigates up one level in object browser', () => {
      // Mock being in object browser
      mockPathname.mockReturnValue('/test-account/repo1/path/to/object');
      
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Press backtick key
      fireEvent.keyDown(document, { key: '`' });
      expect(mockRouter.push).toHaveBeenCalledWith('/test-account/repo1/path/to');
    });

    it('does nothing on backtick at root', () => {
      // Mock being at root
      mockPathname.mockReturnValue('/');
      
      render(<RepositoryList repositories={mockRepositories} />);
      
      // Press backtick key
      fireEvent.keyDown(document, { key: '`' });
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });
}); 