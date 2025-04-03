import React from 'react';
import { render, screen } from '@testing-library/react';
import { RepositoryMetaContent } from './RepositoryMetaContent';
import type { Repository_v2 } from '@/types/repository_v2';
import type { RepositoryStatistics } from '@/types/repository';

describe('RepositoryMetaContent', () => {
  it('renders basic repository information', () => {
    const mockRepository: Repository_v2 = {
      repository_id: 'repo123',
      account_id: 'acc123',
      title: 'Test Repository',
      description: 'A test repository',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
      visibility: 'public',
      metadata: {
        mirrors: {},
        primary_mirror: 'default',
        roles: {}
      }
    };

    render(<RepositoryMetaContent repository={mockRepository} />);

    // Check visibility badge
    expect(screen.getByText('Public')).toBeInTheDocument();
    
    // Check created date
    expect(screen.getByText('Created')).toBeInTheDocument();
    
    // Check updated date
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
  });

  it('renders primary mirror when available', () => {
    const mockRepository: Repository_v2 = {
      repository_id: 'repo123',
      account_id: 'acc123',
      title: 'Test Repository',
      description: 'A test repository',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
      visibility: 'public',
      metadata: {
        mirrors: {},
        primary_mirror: 's3-bucket',
        roles: {}
      }
    };

    render(<RepositoryMetaContent repository={mockRepository} />);

    // Check primary mirror
    expect(screen.getByText('Primary Mirror')).toBeInTheDocument();
    expect(screen.getByText('s3-bucket')).toBeInTheDocument();
  });

  it('renders statistics when available', () => {
    const mockRepository: Repository_v2 = {
      repository_id: 'repo123',
      account_id: 'acc123',
      title: 'Test Repository',
      description: 'A test repository',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
      visibility: 'public',
      metadata: {
        mirrors: {},
        primary_mirror: 'default',
        roles: {}
      }
    };

    const mockStatistics: RepositoryStatistics = {
      repository_id: 'repo123',
      total_objects: 100,
      total_bytes: 1024 * 1024, // 1 MB
      first_object_at: '2023-01-01T00:00:00Z',
      last_object_at: '2023-01-02T00:00:00Z'
    };

    render(<RepositoryMetaContent repository={mockRepository} statistics={mockStatistics} />);

    // Check statistics
    expect(screen.getByText('Total Objects')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    
    expect(screen.getByText('Total Size')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });

  it('renders different visibility badges correctly', () => {
    const publicRepo: Repository_v2 = {
      repository_id: 'repo123',
      account_id: 'acc123',
      title: 'Public Repository',
      description: 'A public repository',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
      visibility: 'public',
      metadata: {
        mirrors: {},
        primary_mirror: 'default',
        roles: {}
      }
    };

    const unlistedRepo: Repository_v2 = {
      ...publicRepo,
      repository_id: 'repo456',
      title: 'Unlisted Repository',
      visibility: 'unlisted'
    };

    const restrictedRepo: Repository_v2 = {
      ...publicRepo,
      repository_id: 'repo789',
      title: 'Restricted Repository',
      visibility: 'restricted'
    };

    const { rerender } = render(<RepositoryMetaContent repository={publicRepo} />);
    expect(screen.getByText('Public')).toBeInTheDocument();
    
    rerender(<RepositoryMetaContent repository={unlistedRepo} />);
    expect(screen.getByText('Unlisted')).toBeInTheDocument();
    
    rerender(<RepositoryMetaContent repository={restrictedRepo} />);
    expect(screen.getByText('Restricted')).toBeInTheDocument();
  });
}); 