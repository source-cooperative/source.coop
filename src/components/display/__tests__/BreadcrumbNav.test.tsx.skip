import { render, screen, fireEvent } from '@testing-library/react';
import { BreadcrumbNav } from '../BreadcrumbNav';

describe('BreadcrumbNav', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    mockOnNavigate.mockClear();
  });

  it('should render root when path is empty', () => {
    render(<BreadcrumbNav path={[]} onNavigate={mockOnNavigate} />);
    expect(screen.getByText('root')).toBeInTheDocument();
  });

  it('should render path segments correctly', () => {
    render(
      <BreadcrumbNav 
        path={['folder1', 'folder2']} 
        onNavigate={mockOnNavigate} 
      />
    );
    expect(screen.getByText('root')).toBeInTheDocument();
    expect(screen.getByText('folder1')).toBeInTheDocument();
    expect(screen.getByText('folder2')).toBeInTheDocument();
  });

  it('should render file name when provided', () => {
    render(
      <BreadcrumbNav 
        path={['folder1']} 
        fileName="test.txt"
        onNavigate={mockOnNavigate} 
      />
    );
    expect(screen.getByText('test.txt')).toBeInTheDocument();
  });

  it('should truncate long paths with ellipsis', () => {
    render(
      <BreadcrumbNav 
        path={['folder1', 'folder2', 'folder3', 'folder4', 'folder5']} 
        onNavigate={mockOnNavigate} 
      />
    );
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('folder1')).toBeInTheDocument();
    expect(screen.getByText('folder2')).toBeInTheDocument();
    expect(screen.getByText('folder4')).toBeInTheDocument();
    expect(screen.getByText('folder5')).toBeInTheDocument();
  });

  it('should navigate when clicking path segments', () => {
    render(
      <BreadcrumbNav 
        path={['folder1', 'folder2']} 
        onNavigate={mockOnNavigate} 
      />
    );
    
    // Click first folder
    fireEvent.click(screen.getByText('folder1'));
    expect(mockOnNavigate).toHaveBeenCalledWith(['folder1']);

    // Click root
    fireEvent.click(screen.getByText('root'));
    expect(mockOnNavigate).toHaveBeenCalledWith([]);
  });

  it('should handle navigation prevention for current segment', () => {
    render(
      <BreadcrumbNav 
        path={['folder1', 'folder2']} 
        onNavigate={mockOnNavigate} 
      />
    );
    
    // Last segment should not be clickable
    const lastSegment = screen.getByText('folder2');
    expect(lastSegment.closest('a')).toBeNull();
  });
}); 