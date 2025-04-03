import { render, screen, fireEvent } from '@testing-library/react';
import { ObjectBrowser } from '../ObjectBrowser';
import { exampleRepositories, _exampleObjects } from '@/tests/fixtures/example-data';

// Mock next/navigation
const mockRouter = { push: jest.fn() };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/test-account/repo1'
}));

describe('ObjectBrowser', () => {
  const mockRepository = exampleRepositories.find(r => r.repository_id === 'repo1')!;
  const mockObjects = [
    {
      id: 'catalog.json',
      repository_id: 'repo1',
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
      repository_id: 'repo1',
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render files and directories', () => {
    render(
      <ObjectBrowser
        repository={mockRepository}
        objects={mockObjects}
        initialPath=""
      />
    );

    expect(screen.getByText('catalog.json')).toBeInTheDocument();
    expect(screen.getByText('data')).toBeInTheDocument();
  });

  it('should navigate to directory when clicked', () => {
    render(
      <ObjectBrowser
        repository={mockRepository}
        objects={mockObjects}
        initialPath=""
      />
    );

    fireEvent.click(screen.getByText('data'));
    expect(mockRouter.push).toHaveBeenCalledWith('/test-account/repo1/data');
  });

  it('should navigate to file when clicked', () => {
    render(
      <ObjectBrowser
        repository={mockRepository}
        objects={mockObjects}
        initialPath=""
      />
    );

    fireEvent.click(screen.getByText('catalog.json'));
    expect(mockRouter.push).toHaveBeenCalledWith('/test-account/repo1/catalog.json');
  });

  it('should show empty state when no objects', () => {
    render(
      <ObjectBrowser
        repository={mockRepository}
        objects={[]}
        initialPath=""
      />
    );

    expect(screen.getByText('This directory is empty.')).toBeInTheDocument();
  });
}); 