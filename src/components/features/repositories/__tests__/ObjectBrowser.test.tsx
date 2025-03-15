import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectBrowser } from '../ObjectBrowser';
import { Repository, RepositoryObject } from '@/types';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

describe('ObjectBrowser', () => {
  const mockRouter = {
    push: jest.fn()
  };

  const mockRepository: Repository = {
    account: {
      account_id: 'test-account',
      name: 'Test Account',
      type: 'individual',
      email: 'test@example.com',
      created_at: '2024-03-14T00:00:00Z',
      updated_at: '2024-03-14T00:00:00Z'
    },
    repository_id: 'test-repo',
    title: 'Test Repository',
    description: 'Test Description',
    private: false,
    created_at: '2024-03-14T00:00:00Z',
    updated_at: '2024-03-14T00:00:00Z'
  };

  const mockObjects: RepositoryObject[] = [
    {
      id: '1',
      repository_id: 'test-repo',
      path: 'file1.txt',
      size: 100,
      type: 'file',
      checksum: 'abc123',
      created_at: '2024-03-14T00:00:00Z',
      updated_at: '2024-03-14T00:00:00Z'
    },
    {
      id: '2',
      repository_id: 'test-repo',
      path: 'dir1',
      size: 0,
      type: 'directory',
      checksum: '',
      created_at: '2024-03-14T00:00:00Z',
      updated_at: '2024-03-14T00:00:00Z'
    }
  ];

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    mockRouter.push.mockClear();
  });

  describe('Keyboard Shortcuts', () => {
    it('should show help dialog when ? is pressed', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
        />
      );

      // Press ? key
      fireEvent.keyDown(document, { key: '?' });

      // Check if help dialog is shown
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should navigate back one level when ~ is pressed in object view', () => {
      const selectedObject = mockObjects[0];
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          selectedObject={selectedObject}
        />
      );

      // Press ~ key
      fireEvent.keyDown(document, { key: '~' });

      // Check if router.push was called with the correct path
      expect(mockRouter.push).toHaveBeenCalledWith(
        `/${mockRepository.account.account_id}/${mockRepository.repository_id}`
      );
    });

    it('should navigate back one level when ~ is pressed in directory view', () => {
      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
          initialPath="dir1/subdir"
        />
      );

      // Press ~ key
      fireEvent.keyDown(document, { key: '~' });

      // Check if router.push was called with the correct path
      expect(mockRouter.push).toHaveBeenCalledWith(
        `/${mockRepository.account.account_id}/${mockRepository.repository_id}/dir1`
      );
    });

    it('should copy URL when c followed by u is pressed', () => {
      // Mock clipboard API
      const mockClipboard = {
        writeText: jest.fn()
      };
      Object.assign(navigator, {
        clipboard: mockClipboard
      });

      render(
        <ObjectBrowser 
          repository={mockRepository} 
          objects={mockObjects}
        />
      );

      // Navigate to first item
      fireEvent.keyDown(document, { key: 'ArrowDown' });

      // Press c then u
      fireEvent.keyDown(document, { key: 'c' });
      fireEvent.keyDown(document, { key: 'u' });

      // Check if clipboard.writeText was called with the correct URL
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

      // Check if router.push was called with the homepage path
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });
}); 