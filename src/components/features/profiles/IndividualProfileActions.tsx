"use client";

import { WelcomeCallout } from "./WelcomeCallout";
import { EmailVerificationCallout } from "@/components/features/auth/EmailVerificationCallout";
import type { IndividualAccount } from "@/types";
interface IndividualProfileActionsProps {
  account: IndividualAccount;
  showWelcome?: boolean;
}

export function IndividualProfileActions({
  account,
  showWelcome = false,
}: IndividualProfileActionsProps) {
  return (
    <>
      <EmailVerificationCallout />
      <WelcomeCallout show={showWelcome} accountId={account.account_id} />
    </>
  );
}
