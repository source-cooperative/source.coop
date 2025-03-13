// src/app/page.tsx
import { Container, Heading, Text, Flex, Box } from '@radix-ui/themes';
import { RepositoryListItem } from '@/components';
import { Repository, Account } from '@/types';
import { fetchRepositories, fetchAccounts } from '@/lib/db/operations';

async function getData() {
  try {
    const repositories = await fetchRepositories();
    const accounts = await fetchAccounts();
    return {
      repositories: repositories || [],
      accounts: accounts || []
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export default async function HomePage() {
  const { repositories, accounts } = await getData();

  return (
    <Container size="4" py="6">
      <Flex direction="column" gap="6">
        <Box>
          <Heading size="8" mb="2">Repositories</Heading>
          <Text size="4" color="gray">
            Discover and explore data repositories
          </Text>
        </Box>

        {repositories.map((repository: Repository) => {
          const account = accounts.find((acc): acc is Account => acc.account_id === repository.account_id);
          return (
            <RepositoryListItem 
              key={`${repository.account_id}/${repository.repository_id}`}
              repository={repository}
              account={account}
            />
          );
        })}
      </Flex>
    </Container>
  );
}