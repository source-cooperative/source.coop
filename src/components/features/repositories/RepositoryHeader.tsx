// For repository detail page header
import { Grid, Box } from '@radix-ui/themes';
import type { Repository, RepositoryStatistics } from '@/types';
import { RepositorySummaryCard } from './RepositorySummaryCard';
import { RepositoryMetaCard } from './RepositoryMetaCard';

interface RepositoryHeaderProps {
  repository: Repository;
  statistics?: RepositoryStatistics;
}

export function RepositoryHeader({ repository, statistics }: RepositoryHeaderProps) {
  return (
    <Grid 
      columns={{ initial: '1', md: '3' }} 
      gap={{ initial: '0', md: '6' }}
      px={{ initial: '0' }}
    >
      <Box 
        width="100%" 
        className="repository-summary" 
        style={{ gridColumn: 'span 2' }}
        px={{ initial: '4', md: '0' }}
        mb={{ initial: '4', md: '0' }}
      >
        <RepositorySummaryCard repository={repository} />
      </Box>
      <Box width="100%" className="repository-meta">
        <RepositoryMetaCard repository={repository} statistics={statistics} />
      </Box>
    </Grid>
  );
} 