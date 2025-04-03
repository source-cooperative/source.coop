import { DataList, Badge, Link } from '@radix-ui/themes';
import type { Repository_v2 } from '@/types/repository_v2';
import type { RepositoryStatistics } from '@/types/repository';
import { MonoText } from '@/components/core';
import { formatBytes } from '@/lib/format';
import { DateText } from '@/components/display';

interface RepositoryMetaContentProps {
  repository: Repository_v2;
  statistics?: RepositoryStatistics;
}

export function RepositoryMetaContent({ repository, statistics }: RepositoryMetaContentProps) {
  return (
    <DataList.Root>
      <DataList.Item>
        <DataList.Label>Visibility</DataList.Label>
        <DataList.Value>
          <Badge color={repository.visibility === 'private' ? "red" : "green"}>
            {repository.visibility === 'private' ? "Private" : "Public"}
          </Badge>
        </DataList.Value>
      </DataList.Item>
      
      {repository.metadata?.primary_mirror && (
        <DataList.Item>
          <DataList.Label>Primary Mirror</DataList.Label>
          <DataList.Value><MonoText>{repository.metadata.primary_mirror}</MonoText></DataList.Value>
        </DataList.Item>
      )}
      
      {statistics && (
        <>
          <DataList.Item>
            <DataList.Label>Total Objects</DataList.Label>
            <DataList.Value><MonoText>{statistics.total_objects}</MonoText></DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Total Size</DataList.Label>
            <DataList.Value><MonoText>{formatBytes(statistics.total_bytes)}</MonoText></DataList.Value>
          </DataList.Item>
        </>
      )}
      
      <DataList.Item>
        <DataList.Label>Created</DataList.Label>
        <DataList.Value><DateText date={repository.created_at} /></DataList.Value>
      </DataList.Item>
      
      <DataList.Item>
        <DataList.Label>Last Updated</DataList.Label>
        <DataList.Value><DateText date={repository.updated_at} /></DataList.Value>
      </DataList.Item>
    </DataList.Root>
  );
} 