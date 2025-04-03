import { Card } from '@radix-ui/themes';
import type { Repository_v2 } from '@/types/repository_v2';
import type { RepositoryStatistics } from '@/types/repository';
import { SectionHeader } from '@/components/core';
import { RepositoryMetaContent } from './RepositoryMetaContent';

interface RepositoryMetaCardProps {
  repository: Repository_v2;
  statistics?: RepositoryStatistics;
}

export function RepositoryMetaCard({ repository, statistics }: RepositoryMetaCardProps) {
  return (
    <Card style={{ height: '100%' }} size={{ initial: '2', sm: '1' }}>
      <SectionHeader title="Repository Details">
        <RepositoryMetaContent repository={repository} statistics={statistics} />
      </SectionHeader>
    </Card>
  );
} 