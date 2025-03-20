import { Container } from '@radix-ui/themes';
import { AuthTabs } from '@/components/features/auth/AuthTabs';
import { redirect } from 'next/navigation';
import { get_account_id } from '@/lib/auth';

export const metadata = {
  title: 'Login or Register',
  description: 'Log in to your account or register for a new account',
};

export default async function AuthPage({ 
  searchParams 
}: { 
  searchParams: { [key: string]: string | string[] | undefined } 
}) {
  // Check if user is already logged in
  const account_id = await get_account_id();
  
  // If user has an account, redirect to their profile
  if (account_id) {
    redirect(`/${account_id}`);
  }
  
  // Default to login tab unless registration is specified
  const flowParam = typeof searchParams.flow === 'string' ? searchParams.flow : undefined;
  const defaultTab = flowParam === 'registration' ? 'register' : 'login';
  
  return (
    <Container size="2" pt="8" pb="9">
      <AuthTabs defaultTab={defaultTab} />
    </Container>
  );
} 