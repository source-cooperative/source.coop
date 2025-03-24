import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPageContent } from '@/components/features/auth/AuthPageContent';
import { VerificationForm } from '@/components/features/auth/VerificationForm';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Login or Register',
  description: 'Log in to your account or register for a new account',
};

export default async function AuthPage({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | string[] | undefined } 
}) {
  // Check auth status on the server
  const session = await getSession();
  
  // If user is authenticated, redirect to home page
  if (session?.identity?.metadata_public?.account_id) {
    redirect('/');
  }
  
  // Await the search params to satisfy Next.js 15+ requirements
  const { flow } = await Promise.resolve(searchParams);
  
  // Handle verification flow
  if (flow === 'verification') {
    return <VerificationForm />;
  }
  
  // Default to login tab unless register is specified
  const defaultTab = flow === 'register' ? 'register' : 'login';
  
  return <AuthPageContent defaultTab={defaultTab} />;
} 