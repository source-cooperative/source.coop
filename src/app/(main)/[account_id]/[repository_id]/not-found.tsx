import { Container, Heading, Text, Flex, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import { LinkBreak2Icon } from '@radix-ui/react-icons';

interface NotFoundProps {
  params?: {
    account_id?: string;
    repository_id?: string;
  };
}

export default function RepositoryNotFound({ params }: NotFoundProps) {
  return (
    <Container>
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        gap="4"
        style={{ minHeight: '60vh' }}
      >
        <LinkBreak2Icon width="32" height="32" />
        <Heading as="h1" size="6">Repository Not Found</Heading>
        <Text as="p" size="3" color="gray">
          {params?.account_id && params?.repository_id ? (
            <>
              The repository <strong>{params.repository_id}</strong> was not found in the account <strong>{params.account_id}</strong>.
            </>
          ) : params?.account_id ? (
            <>
              The repository could not be found in the account <strong>{params.account_id}</strong>.
            </>
          ) : (
            'The requested repository could not be found.'
          )}
        </Text>
        <RadixLink asChild>
          <Link href="/">Return to Home</Link>
        </RadixLink>
      </Flex>
    </Container>
  );
} 