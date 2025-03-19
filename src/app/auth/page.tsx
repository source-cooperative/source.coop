'use client';

import { Container } from '@radix-ui/themes';
import { AuthForms } from '@/components/features/auth/AuthForms';

export default function AuthPage() {
  return (
    <Container>
      <AuthForms />
    </Container>
  );
} 