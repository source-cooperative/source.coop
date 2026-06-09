import { Suspense } from "react";
import { Box, Container, Flex } from "@radix-ui/themes";
import { Navigation, Footer } from "@/components";
import { VerificationBanner } from "@/components/features/auth/VerificationBanner";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  return (
    <Flex direction="column" minHeight="100vh">
      <Navigation />
      <Box flexGrow="1" m="2">
        <Container size="4" py="4">
          {/*
           * Reconciles the user's email-verification state with Ory on every
           * authenticated page load (sync + reminder/confirmation banner).
           * Wrapped in Suspense so its session/DB read streams in without
           * blocking the page content below.
           */}
          <Suspense fallback={null}>
            <VerificationBanner />
          </Suspense>
          {children}
        </Container>
      </Box>
      <Footer />
    </Flex>
  );
}
