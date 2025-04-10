import { Container, Heading, Text, Flex, Link as RadixLink } from '@radix-ui/themes';
import Link from 'next/link';
import { LinkBreak2Icon } from '@radix-ui/react-icons';

interface NotFoundProps {
  params?: {
    account_id?: string;
  };
}

export default function AccountNotFound({ params }: NotFoundProps) {
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
        <Heading as="h1" size="6">Account Not Found</Heading>
        <Text as="p" size="3" color="gray">
          {params?.account_id ? (
            <>
              The account <strong>{params.account_id}</strong> could not be found.
              <br />
              <br />
              If you just created this account, please try refreshing the page.
            </>
          ) : (
            'The requested account could not be found.'
          )}
        </Text>
        <RadixLink asChild>
          <Link href="/">Return to Home</Link>
        </RadixLink>
      </Flex>
    </Container>
  );
} 