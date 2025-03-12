import { Container, Heading, Text, Flex, Box } from '@radix-ui/themes';
import { RepositoryCard } from '@/components/RepositoryCard';
import { fetchRepositories, fetchAccounts } from '@/lib/dynamodb';
import { Repository } from '@/types/repository';

export default async function AccountPage({ 
  params 
}: { 
  params: { 
    account_id: string;
  }
}) {
  console.log('Account page params:', params);

  // Get repositories from DynamoDB instead of example data
  const repositories = await fetchRepositories();
  
  // Find all repositories owned by this account
  const accountRepositories = repositories.filter(
    repo => repo.account_id === params.account_id
  );

  if (accountRepositories.length === 0) {
    return (
      <Container size="4" py="6">
        <Text>No repositories found for account: {params.account_id}</Text>
      </Container>
    );
  }

  return (
    <Container size="4" py="6">
      <Flex direction="column" gap="6">
        <Box>
          <Heading size="8" mb="2">{params.account_id}</Heading>
          <Text size="4" color="gray">Repositories</Text>
        </Box>

        {accountRepositories.map(repository => (
          <RepositoryCard 
            key={`${repository.account_id}/${repository.repository_id}`}
            repository={repository}
          />
        ))}
      </Flex>
    </Container>
  );
} 