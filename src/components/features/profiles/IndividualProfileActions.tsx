'use client';

import { WelcomeCallout } from './WelcomeCallout';
import { VerificationSuccessCallout } from '@/components/features/auth/VerificationSuccessCallout';
import { useSession } from "@ory/elements-react/client";
import type { IndividualAccount } from '@/types/account_v2';

interface IndividualProfileActionsProps {
  account: IndividualAccount;
  showWelcome?: boolean;
}

export function IndividualProfileActions({ account, showWelcome = false }: IndividualProfileActionsProps) {
  const { session } = useSession();
  const currentUserId = session?.identity?.metadata_public?.account_id;
  const _isOwnProfile = currentUserId === account.account_id;

  return (
    <>
      <VerificationSuccessCallout />
      <WelcomeCallout show={showWelcome} accountId={account.account_id} />
    </>
  );
} 