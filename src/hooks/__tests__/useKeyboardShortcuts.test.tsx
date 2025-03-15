import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useRepositoryListKeyboardShortcuts } from '../useRepositoryListKeyboardShortcuts';
import { useObjectBrowserKeyboardShortcuts } from '../useObjectBrowserKeyboardShortcuts';
import type { Repository } from '../../types/repository';
import type { IndividualAccount } from '../../types/account';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

describe('useKeyboardShortcuts', () => {
  it('should show help dialog when ? is pressed', () => {
    const onShowHelp = jest.fn();
    renderHook(() => useKeyboardShortcuts({ onShowHelp }));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: '?' });
      window.dispatchEvent(event);
    });

    expect(onShowHelp).toHaveBeenCalled();
  });

  it('should navigate to homepage when g h is pressed', () => {
    const router = { push: jest.fn() };
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue(router);

    renderHook(() => useKeyboardShortcuts({}));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
    });

    expect(router.push).toHaveBeenCalledWith('/');
  });
});

describe('useRepositoryListKeyboardShortcuts', () => {
  const mockAccount: IndividualAccount = {
    account_id: 'acc1',
    type: 'individual',
    name: 'Test User',
    email: 'test@example.com',
    created_at: '2024-03-14T00:00:00Z',
    updated_at: '2024-03-14T00:00:00Z'
  };

  const mockRepositories: Repository[] = [
    {
      repository_id: 'repo1',
      account: mockAccount,
      title: 'Repo 1',
      description: 'Test repository 1',
      private: false,
      created_at: '2024-03-14T00:00:00Z',
      updated_at: '2024-03-14T00:00:00Z'
    },
    {
      repository_id: 'repo2',
      account: mockAccount,
      title: 'Repo 2',
      description: 'Test repository 2',
      private: false,
      created_at: '2024-03-14T00:00:00Z',
      updated_at: '2024-03-14T00:00:00Z'
    }
  ];

  it('should navigate between repositories with arrow keys', () => {
    const { result } = renderHook(() => 
      useRepositoryListKeyboardShortcuts({
        repositories: mockRepositories,
        onShowHelp: jest.fn()
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(result.current.focusedIndex).toBe(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(result.current.focusedIndex).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });

    expect(result.current.focusedIndex).toBe(0);
  });

  it('should copy repository URL when c is pressed', () => {
    const mockClipboard = { writeText: jest.fn() };
    Object.assign(navigator, { clipboard: mockClipboard });

    const { result } = renderHook(() => 
      useRepositoryListKeyboardShortcuts({
        repositories: mockRepositories,
        onShowHelp: jest.fn()
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    });

    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/acc1/repo1')
    );
  });
});

describe('useObjectBrowserKeyboardShortcuts', () => {
  const mockAccount: IndividualAccount = {
    account_id: 'acc1',
    type: 'individual',
    name: 'Test User',
    email: 'test@example.com',
    created_at: '2024-03-14T00:00:00Z',
    updated_at: '2024-03-14T00:00:00Z'
  };

  const mockRepository: Repository = {
    repository_id: 'repo1',
    account: mockAccount,
    title: 'Repo 1',
    description: 'Test repository 1',
    private: false,
    created_at: '2024-03-14T00:00:00Z',
    updated_at: '2024-03-14T00:00:00Z'
  };

  const mockObjects = [
    {
      name: 'dir1',
      path: 'dir1',
      size: 0,
      updated_at: '2024-03-14T00:00:00Z',
      isDirectory: true
    },
    {
      name: 'file1.txt',
      path: 'file1.txt',
      size: 100,
      updated_at: '2024-03-14T00:00:00Z',
      isDirectory: false
    }
  ];

  it('should navigate between items with arrow keys', () => {
    const { result } = renderHook(() => 
      useObjectBrowserKeyboardShortcuts({
        repository: mockRepository,
        objects: mockObjects,
        currentPath: [],
        onShowHelp: jest.fn(),
        onNavigateToPath: jest.fn(),
        onNavigateToFile: jest.fn()
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(result.current.focusedIndex).toBe(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(result.current.focusedIndex).toBe(1);
  });

  it('should navigate back with ~ key', () => {
    const onNavigateToPath = jest.fn();
    const router = { push: jest.fn() };
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue(router);

    renderHook(() => 
      useObjectBrowserKeyboardShortcuts({
        repository: mockRepository,
        objects: mockObjects,
        currentPath: ['dir1', 'subdir'],
        onShowHelp: jest.fn(),
        onNavigateToPath,
        onNavigateToFile: jest.fn()
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '~' }));
    });

    expect(onNavigateToPath).toHaveBeenCalledWith(['dir1']);
  });

  it('should copy URL when c is pressed', () => {
    const mockClipboard = { writeText: jest.fn() };
    Object.assign(navigator, { clipboard: mockClipboard });

    const { result } = renderHook(() => 
      useObjectBrowserKeyboardShortcuts({
        repository: mockRepository,
        objects: mockObjects,
        currentPath: [],
        onShowHelp: jest.fn(),
        onNavigateToPath: jest.fn(),
        onNavigateToFile: jest.fn()
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
    });

    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/acc1/repo1/dir1')
    );
  });
}); 