import { DataList, Badge, Link as RadixLink } from '@radix-ui/themes';
import type { Repository_v2 } from '@/types/repository_v2';
import type { RepositoryStatistics } from '@/types/repository';
import { MonoText } from '@/components/core';
import { formatBytes } from '@/lib/format';
import { DateText } from '@/components/display';
import Link from 'next/link';
import { Flex } from '@radix-ui/themes';
import { ProfileAvatar } from '@/components/features/profiles/ProfileAvatar';

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
          <Badge color={
            repository.visibility === 'public' ? "green" : 
            repository.visibility === 'unlisted' ? "yellow" : 
            "red"
          }>
            {repository.visibility === 'public' ? "Public" : 
             repository.visibility === 'unlisted' ? "Unlisted" : 
             "Restricted"}
          </Badge>
        </DataList.Value>
      </DataList.Item>
      
      <DataList.Item>
        <DataList.Label>Owner</DataList.Label>
        <DataList.Value>
          <Link href={`/${repository.account_id}`} passHref legacyBehavior>
            <RadixLink>
              <Flex gap="2" align="center">
                {repository.account && <ProfileAvatar account={repository.account} size="2" />}
                <MonoText>{repository.account?.name || repository.account_id}</MonoText>
              </Flex>
            </RadixLink>
          </Link>
        </DataList.Value>
      </DataList.Item>
      
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