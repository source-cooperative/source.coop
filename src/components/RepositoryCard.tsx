import { Flex, Text, Badge, Heading } from '@radix-ui/themes';
import { MonoText } from '@/components/MonoText';
import type { Repository } from '@/types';
import Link from 'next/link';
import { exampleAccounts } from '@/fixtures/example-accounts';
import { formatSize } from '@/utils/format';

interface RepositoryCardProps {
  repository: Repository;
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
  const account = exampleAccounts.find(a => a.id === repository.accountId);
  const accountName = account?.name || repository.accountId;

  return (
    <Flex direction="column" gap="4" className="repository-listing">
      <Link 
        href={`/${repository.accountId}/${repository.id}`}
        style={{ 
          color: 'var(--accent-14)'
        }}
        className="repository-title"
      >
        <Heading as="h3" size="5" weight="bold">
          {repository.meta.title}
        </Heading>
      </Link>

      <Link 
        href={`/${repository.accountId}`}
        style={{ textDecoration: 'none' }}
      >
        <MonoText size="2">
          {accountName}<br />
        </MonoText>
      </Link>

      <Text size="3">{repository.meta.description}</Text>
      
      <Flex gap="3" align="center">
        <Flex gap="2" wrap="wrap">
          {repository.meta.tags.map(tag => (
            <Badge key={tag} variant="soft" size="1" className="mono">
              {tag}
            </Badge>
          ))}
        </Flex>
        
        {repository.stats && (
          <>
            <MonoText size="2">•</MonoText>
            <MonoText size="2">
              {formatSize(repository.stats.size)}
            </MonoText>
          </>
        )}
        <MonoText size="2">•</MonoText>
        <MonoText size="2">{repository.visibility}</MonoText>
      </Flex>
    </Flex>
  );
} 