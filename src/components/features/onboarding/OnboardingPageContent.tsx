"use client";

import { Container, Box, Heading, Text } from "@radix-ui/themes";
import { OnboardingForm } from "@/components/features/onboarding/OnboardingForm";
import { useRouter } from "next/navigation";
import { useSession } from "@ory/elements-react/client";
import { getAccountId } from "@/lib/ory";
import { CONFIG } from "@/lib";

export function OnboardingPageContent() {
  const { session, isLoading } = useSession();
  const router = useRouter();
  const accountId = getAccountId(session);

  if (isLoading) {
    return (
      <Container size="2" pt="8" pb="9">
        Loading...
      </Container>
    );
  }
  
  // If not authenticated, redirect to login
  if (!session) {
    router.push(CONFIG.auth.routes.login);
  }
  
  // If has account_id, redirect to profile
  if (accountId) {
    router.push(`/${accountId}?welcome=true`);
  }

  return (
    <Container size="2" pt="8" pb="9">
      <Box className="mx-auto max-w-md">
        <Heading size="6" mb="3">
          Complete Your Profile
        </Heading>

        <Text size="2" color="gray" mb="6">
          You&apos;re almost done! Choose a username for your account and tell
          us your name.
        </Text>

        <OnboardingForm />
      </Box>
    </Container>
  );
}
