import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthPageContent } from '@/components/features/auth';
import { getServerSession } from '@/lib/auth';

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
  const session = await getServerSession();
  
  // If user is authenticated, redirect to their account
  if (session?.identity?.metadata_public?.account_id) {
    // Only redirect if we're not already on the auth page
    redirect(`/${session.identity.metadata_public.account_id}`);
  }
  
  // Await the search params to satisfy Next.js 15+ requirements
  const { flow } = await Promise.resolve(searchParams);
  
  // Default to login tab unless register is specified
  const defaultTab = flow === 'register' ? 'register' : 'login';
  
  return <AuthPageContent defaultTab={defaultTab} />;
} 