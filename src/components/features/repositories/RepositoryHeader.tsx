// For repository detail page header
import { Grid, Box } from '@radix-ui/themes';
import type { Repository_v2 } from '@/types/repository_v2';
import type { RepositoryStatistics } from '@/types/repository';
import { RepositorySummaryCard } from './RepositorySummaryCard';
import { RepositoryMetaCard } from './RepositoryMetaCard';

interface RepositoryHeaderProps {
  repository: Repository_v2;
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
        <Box mb="4">
          <RepositorySummaryCard repository={repository} />
        </Box>
      </Box>
      <Box width="100%" className="repository-meta">
        <RepositoryMetaCard repository={repository} statistics={statistics} />
      </Box>
    </Grid>
  );
} 