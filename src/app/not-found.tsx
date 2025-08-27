import { Container, Heading, Text, Flex, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import { LinkBreak2Icon } from '@radix-ui/react-icons';

export default function NotFound() {
  return (
    <Container>
      <Flex 
        direction="column" 
        align="center" 
        justify="center" 
        py="9"
        style={{ minHeight: 'calc(100vh - 160px)' }}
      >
        <LinkBreak2Icon 
          width={48} 
          height={48} 
          style={{ color: 'var(--color-text-subtle)' }}
        />
        
        <Heading size="8" mt="5" align="center">
          404: Not Found
        </Heading>
        
        <Text size="4" color="gray" align="center" mt="2">
          We couldn&apos;t find what you&apos;re looking for.
          <br />
          The path may have been moved or no longer exists.
        </Text>

        <Link href="/" passHref legacyBehavior>
          <RadixLink size="3" mt="5">
            Return to Homepage
          </RadixLink>
        </Link>
      </Flex>
    </Container>
  );
} 