'use client';

import { Tooltip } from '@radix-ui/themes';
import { MinusCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import type { Account, IndividualAccount } from '@/types/account_v2';
import { useState, useEffect } from 'react';
import { useSession } from '@ory/elements-react/client';

interface EmailVerificationStatusProps {
  account: Account;
}

// TS helper to access metadata_public fields
interface IdentityMetadataPublic {
  account_id?: string;
  is_admin?: boolean;
  email_verified_at?: string;
}

export function EmailVerificationStatus({ account }: EmailVerificationStatusProps) {
  const [isVerified, setIsVerified] = useState<boolean | null>(null); // null means loading
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const { session, isLoading } = useSession();

  useEffect(() => {
    // Only proceed with verification if account is individual
    if (account.type !== 'individual') {
      return;
    }

    const individualAccount = account as IndividualAccount;

    const checkVerificationStatus = async () => {
      // TODO: This is currently only partially implemented, where we display the verification status of the authenticated user, but we don't actually check the status of the account.
      try {
        const verified = session?.identity?.verifiable_addresses?.some(addr => addr.verified) ?? false;
        setIsVerified(verified);
        console.log(session?.identity?.verifiable_addresses)

        // Get verification timestamp from metadata
        const metadata = account.metadata_public as IdentityMetadataPublic | undefined;
        const verifiedTimestamp = metadata?.email_verified_at;

        if (verifiedTimestamp) {
          const date = new Date(verifiedTimestamp);
          // Format date as DD MMM YYYY
          const day = date.getDate().toString().padStart(2, '0');
          const month = date.toLocaleString('en-US', { month: 'short' });
          const year = date.getFullYear();
          setVerifiedAt(`${day} ${month} ${year}`);
        }
      } catch (error) {
        console.error('Error checking email verification status:', error);
        setIsVerified(false);
      }
    };

    checkVerificationStatus();
  }, [account]);

  // Don't show anything for organizations
  if (account.type !== "individual") {
    return null;
  }

  // Show loading state
  if (isVerified === null) {
    return (
      <Tooltip content="Checking email verification status...">
        <MinusCircledIcon width="16" height="16" />
      </Tooltip>
    );
  }

  // Show verification status
  return (
    <Tooltip
      content={
        isVerified ? `Email verified on ${verifiedAt}` : "Email not verified"
      }
    >
      {isVerified ? (
        <CheckCircledIcon color="green" width="16" height="16" />
      ) : (
        <MinusCircledIcon color="gray" width="16" height="16" />
      )}
    </Tooltip>
  );
} 