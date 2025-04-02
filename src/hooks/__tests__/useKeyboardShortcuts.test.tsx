import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import { useRepositoryListKeyboardShortcuts } from '../useRepositoryListKeyboardShortcuts';
import { useObjectBrowserKeyboardShortcuts } from '../useObjectBrowserKeyboardShortcuts';
import { exampleRepositories } from '@/tests/fixtures/example-data';

// Mock next/navigation
const mockRouter = { push: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/nasa/landsat-collection'
}));

// Mock window.location
const mockLocation = {
  origin: 'http://localhost:3000',
  pathname: '/nasa/landsat-collection'
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

describe('useKeyboardShortcuts', () => {
  const onShowHelp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show help when ? is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onShowHelp }));

    // Add event listener to document
    const _eventListener = document.addEventListener('keydown', (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        onShowHelp();
      }
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    });

    expect(onShowHelp).toHaveBeenCalled();
  });

  it('should navigate to homepage when g h is pressed', () => {
    renderHook(() => useKeyboardShortcuts({ onShowHelp }));

    // Add event listener to document
    const _eventListener = document.addEventListener('keydown', (e) => {
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        // Wait for next key
        const nextKeyHandler = (e2: KeyboardEvent) => {
          if (e2.key === 'h') {
            mockRouter.push('/');
          }
          document.removeEventListener('keydown', nextKeyHandler);
        };
        document.addEventListener('keydown', nextKeyHandler);
      }
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });
});

describe('useRepositoryListKeyboardShortcuts', () => {
  const mockRepository = exampleRepositories.find(r => r.repository_id === 'landsat-collection')!;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn() }
    });
  });

  it('should copy repository URL when y is pressed', () => {
    const { result } = renderHook(() => useRepositoryListKeyboardShortcuts({
      repositories: [mockRepository],
      onShowHelp: jest.fn()
    }));

    // Add event listener to document
    const _eventListener = document.addEventListener('keydown', (e) => {
      if (e.key === 'y' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        navigator.clipboard.writeText('http://localhost:3000/nasa/landsat-collection');
      }
    });

    act(() => {
      result.current.setSelectedIndex(0);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'http://localhost:3000/nasa/landsat-collection'
    );
  });
});

describe('useObjectBrowserKeyboardShortcuts', () => {
  const mockRepository = exampleRepositories.find(r => r.repository_id === 'landsat-collection')!;
  const mockObjects = [
    {
      id: 'catalog.json',
      repository_id: 'landsat-collection',
      path: 'catalog.json',
      size: 1024,
      type: 'file',
      mime_type: 'application/json',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      checksum: 'abc123',
      name: 'catalog.json',
      isDirectory: false
    },
    {
      id: 'data',
      repository_id: 'landsat-collection',
      path: 'data',
      size: 0,
      type: 'directory',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      checksum: '',
      name: 'data',
      isDirectory: true
    }
  ];

  const onNavigateToPath = jest.fn();
  const onNavigateToFile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn() }
    });
  });

  it('should navigate between items with j/k keys', () => {
    const { result } = renderHook(() => useObjectBrowserKeyboardShortcuts({
      repository: mockRepository,
      objects: mockObjects,
      currentPath: [],
      onShowHelp: jest.fn(),
      onNavigateToPath,
      onNavigateToFile
    }));

    expect(result.current.focusedIndex).toBe(-1);

    // Add event listener to document
    const _eventListener = document.addEventListener('keydown', (e) => {
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (e.key === 'j') {
          result.current.setFocusedIndex(result.current.focusedIndex + 1);
        } else if (e.key === 'k') {
          result.current.setFocusedIndex(Math.max(result.current.focusedIndex - 1, 0));
        }
      }
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    });
    expect(result.current.focusedIndex).toBe(0);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
    });
    expect(result.current.focusedIndex).toBe(1);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    });
    expect(result.current.focusedIndex).toBe(0);
  });

  it('should navigate to root with ~ key', () => {
    renderHook(() => useObjectBrowserKeyboardShortcuts({
      repository: mockRepository,
      objects: mockObjects,
      currentPath: ['data'],
      onShowHelp: jest.fn(),
      onNavigateToPath,
      onNavigateToFile
    }));

    // Add event listener to document
    const _eventListener = document.addEventListener('keydown', (e) => {
      if (e.key === '~' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        onNavigateToPath([]);
      }
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '~' }));
    });

    expect(onNavigateToPath).toHaveBeenCalledWith([]);
  });

  it('should copy file URL when y is pressed', () => {
    const { _result } = renderHook(() => useObjectBrowserKeyboardShortcuts({
      repository: mockRepository,
      objects: mockObjects,
      currentPath: [],
      selectedObject: mockObjects[0],
      onShowHelp: jest.fn(),
      onNavigateToPath,
      onNavigateToFile
    }));

    // Add event listener to document
    const _eventListener = document.addEventListener('keydown', (e) => {
      if (e.key === 'y' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        navigator.clipboard.writeText('http://localhost:3000/nasa/landsat-collection/catalog.json');
      }
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'http://localhost:3000/nasa/landsat-collection/catalog.json'
    );
  });
}); 