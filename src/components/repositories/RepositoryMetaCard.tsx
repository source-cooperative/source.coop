import { Card, Text, DataList, Badge, Flex } from '@radix-ui/themes';
import type { Repository, RepositoryStatistics } from '@/types/repository';

interface RepositoryMetaCardProps {
  repository: Repository;
  statistics?: RepositoryStatistics;
}

export function RepositoryMetaCard({ repository, statistics }: RepositoryMetaCardProps) {
  return (
    <Card>
      <Text size="2" weight="bold" mb="2">Repository Details</Text>
      <DataList.Root>
        <DataList.Item>
          <DataList.Label>Visibility</DataList.Label>
          <DataList.Value>
            <Badge color={repository.private ? "red" : "green"}>
              {repository.private ? "Private" : "Public"}
            </Badge>
          </DataList.Value>
        </DataList.Item>
        
        {repository.default_branch && (
          <DataList.Item>
            <DataList.Label>Default Branch</DataList.Label>
            <DataList.Value>{repository.default_branch}</DataList.Value>
          </DataList.Item>
        )}

        {repository.root_metadata?.readme && (
          <DataList.Item>
            <DataList.Label>README</DataList.Label>
            <DataList.Value>{repository.root_metadata.readme}</DataList.Value>
          </DataList.Item>
        )}

        {repository.root_metadata?.license && (
          <DataList.Item>
            <DataList.Label>License</DataList.Label>
            <DataList.Value>{repository.root_metadata.license}</DataList.Value>
          </DataList.Item>
        )}

        {statistics && (
          <>
            <DataList.Item>
              <DataList.Label>Total Objects</DataList.Label>
              <DataList.Value>{statistics.total_objects}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Total Size</DataList.Label>
              <DataList.Value>{formatBytes(statistics.total_bytes)}</DataList.Value>
            </DataList.Item>
          </>
        )}

        <DataList.Item>
          <DataList.Label>Created</DataList.Label>
          <DataList.Value>
            {new Date(repository.created_at).toLocaleDateString()}
          </DataList.Value>
        </DataList.Item>
        
        <DataList.Item>
          <DataList.Label>Last Updated</DataList.Label>
          <DataList.Value>
            {new Date(repository.updated_at).toLocaleDateString()}
          </DataList.Value>
        </DataList.Item>
      </DataList.Root>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 