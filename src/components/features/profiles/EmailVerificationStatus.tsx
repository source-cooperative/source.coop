'use client';

import { Tooltip, Callout } from '@radix-ui/themes';
import { MinusCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import type { Account, IndividualAccount } from '@/types/account';
import { ory } from '@/lib/ory';
import { useState, useEffect } from 'react';
import type { UiNode, UiNodeInputAttributes } from '@ory/client';

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
  // Only show verification status for individual accounts
  if (account.type !== 'individual') {
    return null;
  }

  const individualAccount = account as IndividualAccount;
  const [isVerified, setIsVerified] = useState(individualAccount.email_verified);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const { data: session } = await ory.toSession();
        const verified = session.identity?.verifiable_addresses?.some(addr => addr.verified) ?? false;
        setIsVerified(verified);
        
        // Get verification timestamp from metadata
        const metadata = session.identity?.metadata_public as IdentityMetadataPublic | undefined;
        const verifiedTimestamp = metadata?.email_verified_at;
        
        if (verifiedTimestamp) {
          const date = new Date(verifiedTimestamp);
          setVerifiedAt(date.toLocaleDateString());
        }
      } catch (error) {
        console.error('Failed to check verification status:', error);
      }
    };
    
    checkVerificationStatus();
  }, []);
  
  if (!isVerified) {
    return <MinusCircledIcon color="var(--amber-9)" />;
  }
  
  // Extract domain from email
  const emailDomain = individualAccount.email.split('@')[1];
  
  return (
    <Tooltip content={`${emailDomain} email verified${verifiedAt ? ` on ${verifiedAt}` : ''}.`}>
      <CheckCircledIcon color="var(--green-9)" />
    </Tooltip>
  );
} 