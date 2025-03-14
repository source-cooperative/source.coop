import { Card, Text, DataList, Badge, Flex, Link } from '@radix-ui/themes';
import type { Repository, RepositoryStatistics } from '@/types/repository';
import { DateText, MonoText } from '@/components';
import { SectionHeader } from '@/components/common/SectionHeader';

interface RepositoryMetaCardProps {
  repository: Repository;
  statistics?: RepositoryStatistics;
}

export function RepositoryMetaCard({ repository, statistics }: RepositoryMetaCardProps) {
  return (
    <Card style={{ height: '100%' }} size={{ initial: '2', sm: '1' }}>
      <SectionHeader title="Repository Details">
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
              <DataList.Value><MonoText>{repository.default_branch}</MonoText></DataList.Value>
            </DataList.Item>
          )}
          {repository.root_metadata?.readme && (
            <DataList.Item>
              <DataList.Label>README</DataList.Label>
              <DataList.Value><MonoText>{repository.root_metadata.readme}</MonoText></DataList.Value>
            </DataList.Item>
          )}
          {repository.root_metadata?.license && (
            <DataList.Item>
              <DataList.Label>License</DataList.Label>
              <DataList.Value><MonoText>{repository.root_metadata.license}</MonoText></DataList.Value>
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
            <DataList.Label>Publisher</DataList.Label>
            <DataList.Value>
              <Link href={`/${repository.account.account_id}`} underline="always">
                <MonoText>{repository.account.name}</MonoText>
              </Link>
            </DataList.Value>
          </DataList.Item>          
          <DataList.Item>
            <DataList.Label>Created</DataList.Label>
            <DataList.Value>
              <MonoText><DateText date={repository.created_at} /></MonoText>
            </DataList.Value>
          </DataList.Item>          
          <DataList.Item>
            <DataList.Label>Last Updated</DataList.Label>
            <DataList.Value>
              <MonoText><DateText date={repository.updated_at} /></MonoText>
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </SectionHeader>
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