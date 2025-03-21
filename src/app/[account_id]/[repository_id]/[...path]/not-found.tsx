import { Container, Heading, Text, Flex, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import { CubeIcon } from '@radix-ui/react-icons';

interface NotFoundProps {
  params?: {
    account_id?: string;
    repository_id?: string;
    path?: string[];
  };
}

export default function ObjectNotFound({ params }: NotFoundProps) {
  const pathString = params?.path?.join('/') || '';
  
  return (
    <Container>
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        gap="4"
        style={{ minHeight: '60vh' }}
      >
        <CubeIcon width="32" height="32" />
        <Heading as="h1" size="6">Object Not Found</Heading>
        <Text as="p" size="3" color="gray">
          {params?.account_id && params?.repository_id ? (
            <>
              The object <strong>{pathString}</strong> was not found in the repository <strong>{params.repository_id}</strong>.
            </>
          ) : (
            'The requested object could not be found.'
          )}
        </Text>
        <RadixLink asChild>
          <Link href="/">Return to Home</Link>
        </RadixLink>
      </Flex>
    </Container>
  );
} 