// src/app/page.tsx
import { Container, Heading, Text, Flex, Box } from '@radix-ui/themes';
import { RepositoryListItem } from '@/components';
import type { Repository } from '@/types';
import { fetchRepositories } from '@/lib/db/operations';

async function getData() {
  const repositories = await fetchRepositories();
  return { repositories };
}

export default async function HomePage() {
  const { repositories } = await getData();

  return (
    <Container size="4" py="6">
      <Flex direction="column" gap="6">
        <Box>
          <Heading size="8" mb="2">Repositories</Heading>
          <Text size="4" color="gray">
            Discover and explore data repositories
          </Text>
        </Box>

        {repositories.map((repository: Repository) => (
          <RepositoryListItem 
            key={`${repository.account.account_id}/${repository.repository_id}`}
            repository={repository}
          />
        ))}
      </Flex>
    </Container>
  );
}