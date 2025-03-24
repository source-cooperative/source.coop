'use client';

import { Container } from '@radix-ui/themes';
import { AuthTabs } from '@/components/features/auth/AuthTabs';

interface AuthPageContentProps {
  defaultTab: 'login' | 'register';
}

export function AuthPageContent({ defaultTab }: AuthPageContentProps) {
  return (
    <Container size="2" pt="8" pb="9">
      <AuthTabs defaultTab={defaultTab} />
    </Container>
  );
} 