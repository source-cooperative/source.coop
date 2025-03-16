import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useRepositoryListKeyboardShortcuts } from '../useRepositoryListKeyboardShortcuts';
import { useObjectBrowserKeyboardShortcuts } from '../useObjectBrowserKeyboardShortcuts';
import type { Repository } from '@/types/repository';
import type { IndividualAccount } from '@/types/account';

// Mock next/navigation
const mockRouter = { push: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/test-account/test-repo'
}));

describe('useKeyboardShortcuts', () => {
  const onShowHelp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call onShowHelp when ? is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onShowHelp }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    });

    expect(onShowHelp).toHaveBeenCalled();
  });

  it('should navigate to homepage when g h is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onShowHelp }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });
});

describe('useRepositoryListKeyboardShortcuts', () => {
  const mockAccount: IndividualAccount = {
    account_id: 'acc1',
    name: 'Account 1',
    type: 'individual',
    email: 'test@example.com',
    created_at: '2024-03-14T00:00:00Z',
    updated_at: '2024-03-14T00:00:00Z'
  };

  const mockRepositories: Repository[] = [
    {
      repository_id: 'repo1',
      account: mockAccount,
      title: 'Repository 1',
      description: 'Test Repository 1',
      private: false,
      created_at: '2024-03-14T00:00:00Z',
      updated_at: '2024-03-14T00:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn() }
    });
  });

  it('should copy repository URL when c is pressed', () => {
    const { result } = renderHook(() => useRepositoryListKeyboardShortcuts({
      repositories: mockRepositories,
      onShowHelp: jest.fn()
    }));

    // Set selected index to first repository
    act(() => {
      result.current.setSelectedIndex(0);
    });

    // Press c key
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/acc1/repo1')
    );
  });
});

describe('useObjectBrowserKeyboardShortcuts', () => {
  const mockObjects = [
    {
      name: 'file1.txt',
      path: 'file1.txt',
      size: 100,
      updated_at: '2024-03-14T00:00:00Z',
      isDirectory: false
    },
    {
      name: 'dir1',
      path: 'dir1',
      size: 0,
      updated_at: '2024-03-14T00:00:00Z',
      isDirectory: true
    }
  ];

  const mockAccount: IndividualAccount = {
    account_id: 'acc1',
    name: 'Account 1',
    type: 'individual',
    email: 'test@example.com',
    created_at: '2024-03-14T00:00:00Z',
    updated_at: '2024-03-14T00:00:00Z'
  };

  const mockRepository: Repository = {
    repository_id: 'repo1',
    account: mockAccount,
    title: 'Repository 1',
    description: 'Test Repository 1',
    private: false,
    created_at: '2024-03-14T00:00:00Z',
    updated_at: '2024-03-14T00:00:00Z'
  };

  const onNavigateToPath = jest.fn();
  const onNavigateToFile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn() }
    });
  });

  it('should navigate between items with arrow keys', () => {
    const { result } = renderHook(() => useObjectBrowserKeyboardShortcuts({
      repository: mockRepository,
      objects: mockObjects,
      currentPath: ['dir1'],
      onShowHelp: jest.fn(),
      onNavigateToPath,
      onNavigateToFile
    }));

    // Press j key (down)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    });

    expect(result.current.focusedIndex).toBe(0);

    // Press k key (up)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    });

    expect(result.current.focusedIndex).toBe(-1);
  });

  it('should navigate back with ~ key', () => {
    renderHook(() => useObjectBrowserKeyboardShortcuts({
      repository: mockRepository,
      objects: mockObjects,
      currentPath: ['dir1', 'subdir'],
      onShowHelp: jest.fn(),
      onNavigateToPath,
      onNavigateToFile
    }));

    // Press ~ key
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '~' }));
    });

    expect(onNavigateToPath).toHaveBeenCalledWith(['dir1']);
  });

  it('should copy URL when c is pressed', () => {
    const { result } = renderHook(() => useObjectBrowserKeyboardShortcuts({
      repository: mockRepository,
      objects: mockObjects,
      currentPath: ['dir1'],
      onShowHelp: jest.fn(),
      onNavigateToPath,
      onNavigateToFile
    }));

    // Set focused index to first item
    act(() => {
      result.current.setFocusedIndex(0);
    });

    // Press c key
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/acc1/repo1/dir1')
    );
  });
}); 