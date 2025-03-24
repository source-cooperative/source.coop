'use client';

import { Tooltip, Callout } from '@radix-ui/themes';
import { MinusCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import type { IndividualAccount } from '@/types/account';
import { ory } from '@/lib/ory';
import { useState, useEffect } from 'react';
import type { UiNode, UiNodeInputAttributes } from '@ory/client';

interface EmailVerificationStatusProps {
  account: IndividualAccount;
  showCallout?: boolean;
}

export function EmailVerificationStatus({ account, showCallout = false }: EmailVerificationStatusProps) {
  const [isVerified, setIsVerified] = useState(account.email_verified);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: session } = await ory.toSession();
        setIsVerified(session.identity?.verifiable_addresses?.some(addr => addr.verified) ?? false);
      } catch (error) {
        console.error('Failed to check verification status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResendVerification = async () => {
    try {
      setIsSending(true);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const { data: flow } = await ory.createBrowserVerificationFlow({
        returnTo: `${baseUrl}/${account.account_id}`
      });
      
      const csrfNode = flow.ui.nodes?.find(
        node => node.attributes && 'name' in node.attributes && node.attributes.name === 'csrf_token'
      ) as (UiNode & { attributes: UiNodeInputAttributes }) | undefined;

      const csrfToken = csrfNode?.attributes?.value;

      if (!csrfToken) throw new Error('No CSRF token found');

      await ory.updateVerificationFlow({
        flow: flow.id,
        updateVerificationFlowBody: {
          email: account.email,
          method: 'code',
          csrf_token: csrfToken,
        },
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
    } finally {
      setIsSending(false);
    }
  };

  const domain = account.email.split('@')[1];
  const tooltipText = isVerified 
    ? `${domain} email verified`
    : 'Email not verified';

  return (
    <>
      <Tooltip content={tooltipText}>
        {isVerified ? (
          <CheckCircledIcon style={{ color: 'var(--green-9)' }} />
        ) : (
          <MinusCircledIcon style={{ color: 'var(--amber-9)' }} />
        )}
      </Tooltip>

      {!isVerified && showCallout && (
        <Callout.Root color="orange" mt="4">
          <Callout.Text>
            Please verify your email address to access all features.
            {isSending ? (
              ' Sending verification email...'
            ) : (
              <button 
                onClick={handleResendVerification}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--orange-11)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '0.5rem'
                }}
              >
                Resend verification email
              </button>
            )}
          </Callout.Text>
        </Callout.Root>
      )}
    </>
  );
} 