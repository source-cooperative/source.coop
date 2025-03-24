'use client';

import { Tooltip } from '@radix-ui/themes';
import { MinusCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import type { Account, IndividualAccount } from '@/types/account';
import { ory } from '@/lib/ory';
import { useState, useEffect } from 'react';

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
  
  useEffect(() => {
    // Only proceed with verification if account is individual
    if (account.type !== 'individual') {
      return;
    }
    
    const individualAccount = account as IndividualAccount;
    
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
          // Format date as DD MMM YYYY
          const day = date.getDate().toString().padStart(2, '0');
          const month = date.toLocaleString('en-US', { month: 'short' });
          const year = date.getFullYear();
          setVerifiedAt(`${day} ${month} ${year}`);
        }
      } catch (error) {
        console.error('Failed to check verification status:', error);
        // If check fails, fall back to account value
        setIsVerified(individualAccount.email_verified || false);
      }
    };
    
    checkVerificationStatus();
  }, [account]);
  
  // Show nothing for non-individual accounts
  if (account.type !== 'individual') {
    return null;
  }
  
  // Show nothing while checking verification status
  if (isVerified === null) {
    return null;
  }
  
  if (!isVerified) {
    return (
      <Tooltip content="Email not verified">
        <MinusCircledIcon color="var(--amber-9)" />
      </Tooltip>
    );
  }
  
  // Extract domain from email
  const individualAccount = account as IndividualAccount;
  const emailDomain = individualAccount.email.split('@')[1];
  
  return (
    <Tooltip content={`${emailDomain} email verified${verifiedAt ? ` on ${verifiedAt}` : ''}`}>
      <CheckCircledIcon color="var(--green-9)" />
    </Tooltip>
  );
} 