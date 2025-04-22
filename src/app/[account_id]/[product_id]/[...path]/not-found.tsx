import { Container, Heading, Text } from '@radix-ui/themes';

interface NotFoundProps {
  params?: {
    account_id?: string;
    product_id?: string;
    path?: string[];
  };
}

export default function NotFound({ params }: NotFoundProps) {
  const pathString = params?.path?.join('/') || '';
  
  return (
    <Container size="2" py="6">
      <Heading size="6" mb="4">Not Found</Heading>
      
      {params?.account_id && params?.product_id ? (
        <Text>
          The object <strong>{pathString}</strong> was not found in the product <strong>{params.product_id}</strong>.
        </Text>
      ) : (
        <Text>
          The requested object could not be found.
        </Text>
      )}
    </Container>
  );
} 