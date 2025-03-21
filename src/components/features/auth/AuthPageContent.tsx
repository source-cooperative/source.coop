'use client';

import { Container } from '@radix-ui/themes';
import { AuthTabs } from '@/components/features/auth/AuthTabs';
import { useSession, getAccountId } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthPageContentProps {
  defaultTab: 'login' | 'register';
}

export function AuthPageContent({ defaultTab }: AuthPageContentProps) {
  const { session, isLoading } = useSession();
  const router = useRouter();

  // If authenticated and has account_id, redirect to profile
  useEffect(() => {
    const accountId = getAccountId(session);
    if (!isLoading && accountId) {
      router.push(`/${accountId}`);
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
      <AuthTabs defaultTab={defaultTab} />
    </Container>
  );
} 