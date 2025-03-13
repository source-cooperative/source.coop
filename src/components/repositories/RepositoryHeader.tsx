// For repository detail page header
import { Heading, Text, Flex, Box } from '@radix-ui/themes';
import type { Repository } from '@/types/repository';
import type { Account } from '@/types/account';

interface RepositoryHeaderProps {
  repository: Repository;
  account?: Account;
}

export function RepositoryHeader({ repository, account }: RepositoryHeaderProps) {
  return (
    <Box>
      <Heading size="8" mb="2">{repository.title}</Heading>
      {repository.description && (
        <Text color="gray" size="4" mb="4">{repository.description}</Text>
      )}
      <Flex gap="3" align="center">
        <Text size="2" color="gray">
          Updated {new Date(repository.updated_at).toLocaleDateString()}
        </Text>
        {account && (
          <Text size="2" color="blue">
            Owned by: {account.name}
          </Text>
        )}
      </Flex>
    </Box>
  );
} 