import { Box, Container, Flex } from "@radix-ui/themes";
import { Navigation, Footer } from "@/components";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  return (
    <Flex direction="column" minHeight="100vh">
      <Navigation />
      <Box flexGrow="1">
        <Container size="4" py="4">
          {children}
        </Container>
      </Box>
      <Footer />
    </Flex>
  );
}