import { Flex, Text, Badge } from '@radix-ui/themes';
import { Repository } from '@/types';
import Link from 'next/link';
import { ArrowRightIcon } from '@radix-ui/react-icons';

interface RepositoryCardProps {
  repository: Repository;
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
  return (
    <Link 
      href={`/repositories/${repository.accountId}/${repository.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div className="repository-listing">
        <Flex direction="column" gap="2">
          <Flex align="baseline" gap="2">
            <Text size="2" color="gray" className="mono">
              {repository.accountId}
            </Text>
            <Text size="2" color="gray" className="mono">/</Text>
            <Text size="2" color="gray" className="mono">
              {repository.name}
            </Text>
          </Flex>
          
          <Text size="5" weight="bold" style={{ color: 'var(--accent-9)' }}>
            {repository.meta.title}
          </Text>
          
          <Text color="gray" size="3">{repository.meta.description}</Text>
          
          <Flex gap="3" align="center">
            <Flex gap="2" wrap="wrap">
              {repository.meta.tags.map(tag => (
                <Badge key={tag} variant="soft" size="1">
                  {tag}
                </Badge>
              ))}
            </Flex>
            
            {repository.stats && (
              <>
                <Text size="2" color="gray">•</Text>
                <Text size="2" color="gray">
                  {(repository.stats.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                </Text>
              </>
            )}
            <Text size="2" color="gray">•</Text>
            <Text size="2" color="gray">{repository.visibility}</Text>
          </Flex>
        </Flex>
      </div>
    </Link>
  );
} 