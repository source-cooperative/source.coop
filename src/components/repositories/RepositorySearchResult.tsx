// For search results with more metadata and highlighting
import { Card, Text, Flex, Badge } from '@radix-ui/themes';
import Link from 'next/link';
import type { Repository } from '@/types/repository';
import type { Account } from '@/types/account';
import { DateText } from '@/components';

interface RepositorySearchResultProps {
  repository: Repository;
  account?: Account;
  highlight?: {
    title?: string;
    description?: string;
  };
}

export function RepositorySearchResult({ repository, account, highlight }: RepositorySearchResultProps) {
  return (
    <Link href={`/${repository.account_id}/${repository.repository_id}`}>
      <Card>
        <Flex direction="column" gap="2">
          <Text size="5" weight="bold" 
            dangerouslySetInnerHTML={{ __html: highlight?.title || repository.title }} 
          />
          {(highlight?.description || repository.description) && (
            <Text color="gray" 
              dangerouslySetInnerHTML={{ 
                __html: highlight?.description || repository.description 
              }} 
            />
          )}
          <Flex gap="3" align="center">
            <Text size="2" color="gray">
              Updated <DateText date={repository.updated_at} />
            </Text>
            {account && (
              <Text size="2" color="blue">
                {account.name}
              </Text>
            )}
            <Badge color={repository.private ? "red" : "green"}>
              {repository.private ? "Private" : "Public"}
            </Badge>
          </Flex>
        </Flex>
      </Card>
    </Link>
  );
} 