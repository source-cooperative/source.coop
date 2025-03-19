import { redirect } from 'next/navigation';
import { OnboardingForm } from '@/components/features/onboarding/OnboardingForm';
import { Box, Text, Heading } from '@radix-ui/themes';
import { getSession } from '@/lib/auth';
import { CONFIG } from '@/lib/config';

const KRATOS_URL = CONFIG.auth.kratosUrl;

export default async function OnboardingPage() {
  const session = await getSession();

  // If not logged in, redirect to auth page
  if (!session) {
    redirect('/auth');
  }

  // If user has already completed onboarding, redirect to home
  if (session.identity?.traits?.account_id) {
    redirect('/');
  }

  return (
    <Box p="4" maxWidth="600px" mx="auto">
      <Box mb="6">
        <Heading size="8" mb="2">
          Complete Your Profile
        </Heading>
        <Text as="p" color="gray">
          Please provide your account information to get started.
        </Text>
      </Box>

      <OnboardingForm />
    </Box>
  );
} 