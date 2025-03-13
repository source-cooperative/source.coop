import { Card, Text, DataList } from '@radix-ui/themes';
import type { Repository } from '@/types/repository';

interface RepositoryMetaCardProps {
  repository: Repository;
}

export function RepositoryMetaCard({ repository }: RepositoryMetaCardProps) {
  return (
    <Card>
      <DataList.Root>
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
        <DataList.Item>
          <DataList.Label>Repository ID</DataList.Label>
          <DataList.Value>{repository.repository_id}</DataList.Value>
        </DataList.Item>
      </DataList.Root>
    </Card>
  );
} 