import { Container, Heading, Text } from '@radix-ui/themes';

interface NotFoundProps {
  params?: {
    account_id?: string;
    product_id?: string;
  };
}

export default function NotFound({ params }: NotFoundProps) {
  return (
    <Container size="2" py="6">
      <Heading size="6" mb="4">Not Found</Heading>
      
      {params?.account_id && params?.product_id ? (
        <Text>
          The product <strong>{params.product_id}</strong> was not found in the account <strong>{params.account_id}</strong>.
        </Text>
      ) : (
        <Text>
          The requested product could not be found.
        </Text>
      )}
    </Container>
  );
} 