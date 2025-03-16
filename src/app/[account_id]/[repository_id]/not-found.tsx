import { Container, Heading, Text, Flex, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import { FileIcon } from '@radix-ui/react-icons';

interface NotFoundProps {
  params: {
    account_id: string;
    repository_id: string;
  };
}

export default function RepositoryNotFound({ params }: NotFoundProps) {
  const { account_id, repository_id } = params;
  
  return (
    <Container>
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        py="9"
        style={{ minHeight: 'calc(100vh - 160px)' }}
      >
        <FileIcon 
          width={48} 
          height={48} 
          style={{ color: 'var(--gray-8)' }}
        />
        
        <Heading size="8" mt="5" align="center">
          404: Path Not Found
        </Heading>
        
        <Text size="4" color="gray" align="center" mt="2">
          We couldn&apos;t find this path in the repository.
        </Text>

        <Flex gap="3" mt="5">
          <Link href={`/${account_id}/${repository_id}`} passHref legacyBehavior>
            <RadixLink size="3">
              Return to Repository
            </RadixLink>
          </Link>
          
          <Link href="/" passHref legacyBehavior>
            <RadixLink size="3">
              Go to Homepage
            </RadixLink>
          </Link>
        </Flex>
      </Flex>
    </Container>
  );
} 