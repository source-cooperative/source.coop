import { useRouter } from 'next/router';
import { Container, Heading, Text, Flex, Card, Box } from '@radix-ui/themes';
import { exampleRepositories } from '@/fixtures/example-data';
import { Repository } from '@/types';

function DataCiteSection({ repository }: { repository: Repository }) {
  if (!repository.meta.dataCite) return null;

  const { dataCite } = repository.meta;

  return (
    <Card>
      <Heading size="4" mb="4">Dataset Information</Heading>
      
      {dataCite.doi && (
        <Flex direction="column" mb="4">
          <Text weight="bold">DOI</Text>
          <Text>{dataCite.doi}</Text>
        </Flex>
      )}

      <Flex direction="column" mb="4">
        <Text weight="bold">Creators</Text>
        {dataCite.creators.map((creator, index) => (
          <Text key={index}>
            {creator.name} ({creator.nameType})
          </Text>
        ))}
      </Flex>

      <Flex direction="column" mb="4">
        <Text weight="bold">Publication Details</Text>
        <Text>Published by {dataCite.publisher} in {dataCite.publicationYear}</Text>
        <Text>Type: {dataCite.resourceType.resourceTypeGeneral} - {dataCite.resourceType.resourceType}</Text>
      </Flex>

      {dataCite.subjects && (
        <Flex direction="column" mb="4">
          <Text weight="bold">Subjects</Text>
          {dataCite.subjects.map((subject, index) => (
            <Text key={index}>{subject.subject}</Text>
          ))}
        </Flex>
      )}

      {dataCite.contributors && (
        <Flex direction="column" mb="4">
          <Text weight="bold">Contributors</Text>
          {dataCite.contributors.map((contributor, index) => (
            <Text key={index}>
              {contributor.name} - {contributor.contributorType}
            </Text>
          ))}
        </Flex>
      )}
    </Card>
  );
}

export default function RepositoryDetail() {
  const router = useRouter();
  const { account_id, repository_id } = router.query;

  // In production, this would be an API call
  const repository = exampleRepositories.find(
    repo => repo.accountId === account_id && repo.id === repository_id
  );

  if (!repository) {
    return (
      <Container size="4" py="6">
        <Text>Repository not found</Text>
      </Container>
    );
  }

  return (
    <Container size="4" py="6">
      <Flex direction="column" gap="6">
        <Box>
          <Heading size="8" mb="2">{repository.meta.title}</Heading>
          <Text size="4" color="gray">{repository.meta.description}</Text>
        </Box>

        {repository.meta.dataCite && <DataCiteSection repository={repository} />}
      </Flex>
    </Container>
  );
}
