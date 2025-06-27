'use client';

import { WelcomeCallout } from './WelcomeCallout';
import { VerificationSuccessCallout } from '@/components/features/auth/VerificationSuccessCallout';
import type { IndividualAccount } from "@/types";
interface IndividualProfileActionsProps {
  account: IndividualAccount;
  showWelcome?: boolean;
}

export function IndividualProfileActions({ account, showWelcome = false }: IndividualProfileActionsProps) {
  return (
    <>
      <VerificationSuccessCallout />
      <WelcomeCallout show={showWelcome} accountId={account.account_id} />
    </>
  );
} 