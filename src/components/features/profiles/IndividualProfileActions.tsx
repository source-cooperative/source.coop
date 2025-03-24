'use client';

import { Button, Callout } from '@radix-ui/themes';
import Link from 'next/link';
import { WelcomeCallout } from './WelcomeCallout';
import { VerificationCallout } from './VerificationCallout';
import { useAuth } from '@/hooks/useAuth';
import type { IndividualAccount } from '@/types/account';

interface IndividualProfileActionsProps {
  account: IndividualAccount;
  showWelcome?: boolean;
}

export function IndividualProfileActions({ account, showWelcome = false }: IndividualProfileActionsProps) {
  const { session } = useAuth();
  const currentUserId = session?.identity?.metadata_public?.account_id;
  const isOwnProfile = currentUserId === account.account_id;

  return (
    <>
      {isOwnProfile && !account.email_verified && (
        <VerificationCallout accountId={account.account_id} email={account.email} />
      )}

      <WelcomeCallout show={showWelcome} accountId={account.account_id} />
    </>
  );
} 