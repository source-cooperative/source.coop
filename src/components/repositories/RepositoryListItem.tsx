// For homepage and general listing
import { Card, Text, Flex } from '@radix-ui/themes';
import Link from 'next/link';
import type { Repository } from '@/types/repository';
import type { Account } from '@/types/account';
import { DateText } from '@/components';

interface RepositoryListItemProps {
  repository: Repository;
  account?: Account;
}

export function RepositoryListItem({ repository, account }: RepositoryListItemProps) {
  return (
    <Link href={`/${repository.account.account_id}/${repository.repository_id}`}>
      <Card>
        <Flex direction="column" gap="2">
          <Text size="5" weight="bold">{repository.title}</Text>
          {repository.description && (
            <Text color="gray">{repository.description}</Text>
          )}
          <Flex gap="3">
            <Text size="2" color="gray">
              Updated <DateText date={repository.updated_at} />
            </Text>
            {account && (
              <Text size="2" color="blue">
                {account.name}
              </Text>
            )}
          </Flex>
        </Flex>
      </Card>
    </Link>
  );
} 