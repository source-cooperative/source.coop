import { Box, Container, Flex } from "@radix-ui/themes";
import { Navigation, Footer, S3CredentialsProvider, UploadProvider } from "@/components";
import { ProxyCredentialsProvider } from "@/components/features/products/ProxyCredentialsProvider";
import { getPageSession } from "@/lib";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await getPageSession();
  const isAuthenticated = !!session?.identity_id;

  return (
    <ProxyCredentialsProvider isAuthenticated={isAuthenticated}>
      <S3CredentialsProvider>
        <UploadProvider>
          <Flex direction="column" minHeight="100vh">
            <Navigation />
            <Box flexGrow="1" m="2">
              <Container size="4" py="4">
                {children}
              </Container>
            </Box>
            <Footer />
          </Flex>
        </UploadProvider>
      </S3CredentialsProvider>
    </ProxyCredentialsProvider>
  );
}
