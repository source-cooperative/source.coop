/**
 * Home Page - Lists all repositories
 * 
 * KEEP IT SIMPLE:
 * 1. No URL params needed (root route /)
 * 2. Get data -> Transform if needed -> Render
 * 3. Trust your types, avoid complex validation
 * 4. Let Next.js handle errors (404, 500, etc.)
 * 5. No helper functions unless truly needed
 */

// src/app/page.tsx
import { Container, Heading, Text, Flex, Box } from '@radix-ui/themes';
import { RepositoryList } from '@/components/features/repositories/RepositoryList';
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

        <RepositoryList repositories={repositories} />
      </Flex>
    </Container>
  );
}