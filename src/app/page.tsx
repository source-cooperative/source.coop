import { Container, Heading, Flex } from '@radix-ui/themes';
import { exampleRepositories } from '@/fixtures/example-data';
import { RepositoryCard } from '@/components/RepositoryCard';

export default function Home() {
  // Later this will fetch from the API
  const repositories = exampleRepositories;

  return (
    <Container size="4" py="6">
      <Heading size="8" mb="8">Source Cooperative</Heading>
      
      <Flex direction="column" gap="5">
        {repositories.map((repo) => (
          <RepositoryCard key={repo.id} repository={repo} />
        ))}
      </Flex>

      
    </Container>
  );
} 