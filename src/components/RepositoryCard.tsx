import { LinkCard } from './common/LinkCard';
import type { Repository } from '@/types/repository';
import type { Account } from '@/types/account';
import { Text } from '@radix-ui/themes';

interface RepositoryCardProps {
  repository: Repository;
  account?: Account;
}

export function RepositoryCard({ repository, account }: RepositoryCardProps) {
  return (
    <LinkCard 
      href={`/${repository.account_id}/${repository.repository_id}`}
      title={repository.title}
    >
      <Text>{repository.description}</Text>
      <Text size="2" color="gray">
        Updated {new Date(repository.updated_at).toLocaleDateString()}
      </Text>
      {account && (
        <Text size="2" color="blue">
          Owned by: {account.name}
        </Text>
      )}
    </LinkCard>
  );
} 