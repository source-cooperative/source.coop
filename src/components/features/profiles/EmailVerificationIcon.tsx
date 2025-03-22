'use client';

import { useState, useEffect } from 'react';
import { Tooltip } from '@radix-ui/themes';
import { MinusCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { ory } from '@/lib/ory';

interface EmailVerificationIconProps {
  initialVerified: boolean;
}

export function EmailVerificationIcon({ initialVerified }: EmailVerificationIconProps) {
  const [isVerified, setIsVerified] = useState(initialVerified);

  // Check verification status periodically
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const { data: session } = await ory.toSession();
        if (session.identity?.verifiable_addresses?.some(addr => addr.verified)) {
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Failed to check verification status:', error);
      }
    };

    // Check immediately and then every 5 seconds
    checkVerificationStatus();
    const interval = setInterval(checkVerificationStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Tooltip content={isVerified ? "Email verified" : "Email not verified"}>
      {isVerified ? (
        <CheckCircledIcon style={{ color: 'var(--green-9)' }} />
      ) : (
        <MinusCircledIcon style={{ color: 'var(--amber-9)' }} />
      )}
    </Tooltip>
  );
} 