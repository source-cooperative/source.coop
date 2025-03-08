import { Container } from '@radix-ui/themes';
import { exampleRepositories } from '@/fixtures/example-data';

export default function RepositoryPage({ 
  params 
}: { 
  params: { 
    account_id: string;
    repository_id: string;
  }
}) {
  // Later this will fetch from the API
  const repository = exampleRepositories.find(
    repo => repo.id === params.repository_id
  );

  if (!repository) {
    return <div>Repository not found</div>;
  }

  return (
    <Container size="4" py="6">
      <h1>{repository.meta.title}</h1>
      {/* Add more repository details here */}
    </Container>
  );
} 