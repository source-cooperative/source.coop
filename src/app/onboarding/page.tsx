import { Container, Box, Heading, Text } from '@radix-ui/themes';
import { OnboardingForm } from '@/components/features/onboarding/OnboardingForm';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const metadata = {
  title: 'Complete Your Profile',
  description: 'Choose your username and set up your profile',
};

export default async function OnboardingPage() {
  // Check session
  const session = await getSession();
  
  // If no session, redirect to auth
  if (!session) {
    redirect('/auth');
  }

  // If user already has an account_id, redirect to their profile
  const accountId = session.identity?.metadata_public?.account_id;
  if (accountId) {
    redirect(`/${accountId}`);
  }

  return (
    <Container size="2" pt="8" pb="9">
      <Box className="mx-auto max-w-md">
        <Heading size="6" mb="3" align="center">Complete Your Profile</Heading>
        
        <Text size="2" color="gray" mb="6" align="center">
          You're almost done! Choose a username for your account and tell us your name.
          Your username will be your unique identifier on source.coop.
        </Text>

        <OnboardingForm />
      </Box>
    </Container>
  );
} 