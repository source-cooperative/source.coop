import { Metadata } from 'next';
import { OnboardingPageContent } from '@/components/features/onboarding';

export const metadata: Metadata = {
  title: 'Complete Your Profile',
  description: 'Choose your username and set up your profile',
};

export default async function OnboardingPage() {
  return <OnboardingPageContent />;
} 