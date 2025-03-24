import { redirect } from 'next/navigation';

export default async function EmailVerifiedPage() {
  console.log('Email verification page loaded');
  
  // Simple approach: always redirect to onboarding with verified flag
  // This ensures users don't get stuck on this page
  console.log('Email verified, redirecting to onboarding');
  redirect('/onboarding?verified=true');
} 