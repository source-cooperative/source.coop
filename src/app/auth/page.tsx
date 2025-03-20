import { Suspense } from 'react';
import { Tabs, Box, Flex, Text, Container } from '@radix-ui/themes';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { RegistrationForm } from '@/components/features/auth/RegistrationForm';
import { redirect } from 'next/navigation';
import { get_account_id } from '@/lib/auth';

export const metadata = {
  title: 'Login or Register',
  description: 'Log in to your account or register for a new account',
};

type AuthPageProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  // Check if user is already logged in
  const account_id = await get_account_id();
  
  // If user has an account, redirect to their profile
  if (account_id) {
    redirect(`/${account_id}`);
  }
  
  // Default to login tab unless registration is specified
  const flowParam = searchParams.flow;
  const defaultTab = flowParam === 'registration' ? 'register' : 'login';
  
  return (
    <Container size="2" pt="8" pb="9">
      <Box className="mx-auto max-w-md">
        <Flex mb="5" justify="center">
          <Text size="6" weight="bold">Welcome</Text>
        </Flex>
        
        <Tabs.Root defaultValue={defaultTab}>
          <Tabs.List>
            <Tabs.Trigger value="login">Login</Tabs.Trigger>
            <Tabs.Trigger value="register">Register</Tabs.Trigger>
          </Tabs.List>
          
          <Box pt="4">
            <Tabs.Content value="login">
              <Suspense fallback={<Text>Loading login form...</Text>}>
                <LoginForm />
              </Suspense>
            </Tabs.Content>
            
            <Tabs.Content value="register">
              <Suspense fallback={<Text>Loading registration form...</Text>}>
                <RegistrationForm />
              </Suspense>
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Box>
    </Container>
  );
} 