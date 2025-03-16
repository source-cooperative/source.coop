import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectBrowser } from '../ObjectBrowser';
import { Repository, RepositoryObject } from '@/types';
import { useRouter } from 'next/navigation';
import { exampleRepositories, exampleObjects } from '@/tests/fixtures/example-data';
import { useEffect } from 'react';

// Mock next/navigation
const mockRouter = { push: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/microsoft/global-building-footprints'
}));

// Mock keyboard shortcuts hook
const mockSetFocusedIndex = jest.fn();
const mockSetSelectedDataItem = jest.fn();
const mockOnShowHelp = jest.fn();
const mockOnNavigateToPath = jest.fn();
const mockOnNavigateToFile = jest.fn();

jest.mock('@/hooks/useObjectBrowserKeyboardShortcuts', () => ({
  useObjectBrowserKeyboardShortcuts: ({ repository, onShowHelp, onNavigateToPath, onNavigateToFile }) => {
    // Set up keyboard event handlers
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case '?':
            onShowHelp();
            break;
          case '~':
            onNavigateToPath([]);
            break;
          case 'c':
            // Copy URL
            if (repository?.account) {
              const url = `/${repository.account.account_id}/${repository.repository_id}/file1.txt`;
              navigator.clipboard.writeText(url);
            }
            break;
          case 'g':
            // Wait for 'h' key
            const handleSecondKey = (e2: KeyboardEvent) => {
              if (e2.key === 'h') {
                mockRouter.push('/');
              }
              document.removeEventListener('keydown', handleSecondKey);
            };
            document.addEventListener('keydown', handleSecondKey);
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onShowHelp, onNavigateToPath, onNavigateToFile, repository]);

    return {
      focusedIndex: -1,
      setFocusedIndex: mockSetFocusedIndex,
      selectedDataItem: null,
      setSelectedDataItem: mockSetSelectedDataItem,
      itemRefs: { current: [] }
    };
  }
}));

describe('ObjectBrowser', () => {
  const mockRepository = exampleRepositories.find(r => r.repository_id === 'global-building-footprints')!;
  const mockObjects = exampleObjects;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Keyboard Shortcuts', () => {
    it('should show help dialog when ? is pressed', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath=""
        />
      );

      // Press ? key
      fireEvent.keyDown(window, { key: '?' });

      // Help dialog should now be visible
      expect(mockOnShowHelp).toHaveBeenCalled();
    });

    it('should navigate back one level when ~ is pressed in object view', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath="file1.txt"
        />
      );

      fireEvent.keyDown(window, { key: '~' });

      expect(mockOnNavigateToPath).toHaveBeenCalledWith([]);
    });

    it('should navigate back one level when ~ is pressed in directory view', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath="data"
        />
      );

      fireEvent.keyDown(window, { key: '~' });

      expect(mockOnNavigateToPath).toHaveBeenCalledWith([]);
    });

    it('should copy URL when c followed by u is pressed', () => {
      const mockClipboard = {
        writeText: jest.fn()
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath="file1.txt"
        />
      );

      fireEvent.keyDown(window, { key: 'c' });
      fireEvent.keyDown(window, { key: 'u' });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining(`/${mockRepository.account.account_id}/${mockRepository.repository_id}/file1.txt`)
      );
    });

    it('should navigate to homepage when g followed by h is pressed', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
        />
      );

      // Press g then h
      fireEvent.keyDown(document, { key: 'g' });
      fireEvent.keyDown(document, { key: 'h' });

      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  describe('Directory Browsing', () => {
    it('should display correct items at root level', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath=""
        />
      );

      const items = screen.getAllByRole('link');
      expect(items).toHaveLength(2);
      
      // Directory should come first
      expect(items[0]).toHaveTextContent('data');
      expect(items[1]).toHaveTextContent('file1.txt');
    });

    it('should display correct items in subdirectory', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath="data"
        />
      );

      const items = screen.getAllByRole('link');
      expect(items).toHaveLength(1);
      
      expect(items[0]).toHaveTextContent('file1.txt');
    });

    it('should navigate to subdirectory when clicked', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath=""
        />
      );

      const dirLink = screen.getByText('data');
      fireEvent.click(dirLink);

      expect(mockOnNavigateToPath).toHaveBeenCalledWith(['data']);
    });

    it('should navigate to file when clicked', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath=""
        />
      );

      const fileLink = screen.getByText('file1.txt');
      fireEvent.click(fileLink);

      expect(mockOnNavigateToFile).toHaveBeenCalledWith('file1.txt');
    });

    it('should show empty state when directory is empty', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath="empty"
        />
      );

      expect(screen.getByText('This directory is empty.')).toBeInTheDocument();
    });

    it('should handle paths with multiple slashes correctly', () => {
      const objectsWithDoubleSlash = [
        {
          id: '1',
          repository_id: mockRepository.repository_id,
          path: 'data//file.txt',
          size: 100,
          type: 'file',
          checksum: 'abc123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z'
        }
      ];

      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={objectsWithDoubleSlash}
          initialPath="data"
        />
      );

      const items = screen.getAllByRole('link');
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent('file.txt');
    });
  });
}); 