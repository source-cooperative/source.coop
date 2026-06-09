import { Box, Container, Flex } from "@radix-ui/themes";
import { Navigation, Footer } from "@/components";
import { getPageSession, reconcileEmailVerification } from "@/lib/api/utils";
import { EmailVerificationCallout } from "@/components/features/auth/EmailVerificationCallout";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  // On every authenticated page load, reconcile the user's email-verification
  // state with Ory: sync a newly-verified email into our database and surface
  // the appropriate banner (reminder or confirmation).
  const session = await getPageSession();
  const emailStatus = session
    ? await reconcileEmailVerification(session)
    : null;

  return (
    <Flex direction="column" minHeight="100vh">
      <Navigation />
      <Box flexGrow="1" m="2">
        <Container size="4" py="4">
          {emailStatus && <EmailVerificationCallout status={emailStatus} />}
          {children}
        </Container>
      </Box>
      <Footer />
    </Flex>
  );
}
