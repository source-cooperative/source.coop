import { LinkCard } from './LinkCard';
import type { Repository } from '@/types/repository';
import type { Account } from '@/types/account';
import { Text, Heading } from '@radix-ui/themes';

interface RepositoryCardProps {
  repository: Repository;
  account?: Account;
  hideLink?: boolean;
  titleAsH1?: boolean;
}

export function RepositoryCard({ repository, account, hideLink, titleAsH1 }: RepositoryCardProps) {
  const content = (
    <>
      {titleAsH1 ? (
        <Heading size="8" mb="4">{repository.title}</Heading>
      ) : (
        <Text as="div" size="5" weight="bold" mb="2">{repository.title}</Text>
      )}
      <Text mb="4">{repository.description}</Text>
      <Text size="2" color="gray">
        Updated {new Date(repository.updated_at).toLocaleDateString()}
      </Text>
      {account && (
        <Text size="2" color="blue">
          Owned by: {account.name}
        </Text>
      )}
    </>
  );

  if (hideLink) {
    return <div>{content}</div>;
  }

  return (
    <LinkCard 
      href={`/${repository.account_id}/${repository.repository_id}`}
      title={repository.title}
    >
      {content}
    </LinkCard>
  );
} 