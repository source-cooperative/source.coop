'use client';

import { Container, Box, Heading, Text } from '@radix-ui/themes';
import { OnboardingForm } from '@/components/features/onboarding/OnboardingForm';
import { useAuth, getAccountId } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function OnboardingPageContent() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  // If not authenticated, redirect to login
  // If has account_id, redirect to profile
  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.push('/auth?flow=login');
      } else {
        const accountId = getAccountId(session);
        if (accountId) {
          router.push(`/${accountId}?welcome=true`);
        }
      }
    }
  }, [isLoading, session, router]);

  if (isLoading) {
    return (
      <Container size="2" pt="8" pb="9">
        Loading...
      </Container>
    );
  }

  return (
    <Container size="2" pt="8" pb="9">
      <Box className="mx-auto max-w-md">
        <Heading size="6" mb="3">Complete Your Profile</Heading>
        
        <Text size="2" color="gray" mb="6">
          You&apos;re almost done! Choose a username for your account and tell us your name.
        </Text>

        <OnboardingForm />
      </Box>
    </Container>
  );
} 