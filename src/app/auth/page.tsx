import { Metadata } from 'next';
import { AuthPageContent } from '@/components/features/auth';

export const metadata: Metadata = {
  title: 'Login or Register',
  description: 'Log in to your account or register for a new account',
};

export default async function AuthPage({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | string[] | undefined } 
}) {
  // Await the search params to satisfy Next.js 15+ requirements
  const { flow } = await Promise.resolve(searchParams);
  
  // Default to login tab unless registration is specified
  const defaultTab = flow === 'registration' ? 'register' : 'login';
  
  return <AuthPageContent defaultTab={defaultTab} />;
} 