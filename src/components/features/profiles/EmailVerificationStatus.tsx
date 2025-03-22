'use client';

import { Text, Flex, Link as RadixLink } from '@radix-ui/themes';
import type { IndividualAccount } from '@/types/account';
import { useState, useEffect } from 'react';
import { UiNode, UiNodeInputAttributes } from '@ory/client';
import { ory } from '@/lib/ory';
import { useRouter } from 'next/navigation';

interface EmailVerificationStatusProps {
  account: IndividualAccount;
}

export function EmailVerificationStatus({ account }: EmailVerificationStatusProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [isVerified, setIsVerified] = useState(account.email_verified);
  const router = useRouter();

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

  if (!isVerified) {
    const handleResendVerification = async () => {
      try {
        setStatus('sending');
        
        // Create a new browser verification flow with return URL to profile
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const { data: flow } = await ory.createBrowserVerificationFlow({
          returnTo: `${baseUrl}/profile`
        });
        
        console.log('Verification flow created:', JSON.stringify(flow, null, 2));
        
        if (!flow.id) {
          throw new Error('No flow ID received from Ory');
        }
        
        // Get the CSRF token from the flow
        const csrfNode = flow.ui.nodes?.find(
          (node: UiNode) => 
            node.attributes && 
            'name' in node.attributes && 
            node.attributes.name === 'csrf_token'
        ) as UiNode & { attributes: UiNodeInputAttributes } | undefined;

        const csrfToken = csrfNode?.attributes?.value;
        console.log('CSRF token:', csrfToken);

        if (!csrfToken) {
          throw new Error('No CSRF token found in flow');
        }

        // Submit the verification flow with the user's email
        const updateBody = {
          email: account.email,
          method: 'code' as const,
          csrf_token: csrfToken,
        };
        console.log('Sending verification update with body:', JSON.stringify(updateBody, null, 2));

        const { data: result } = await ory.updateVerificationFlow({
          flow: flow.id,
          updateVerificationFlowBody: updateBody,
        });

        console.log('Verification flow result:', JSON.stringify(result, null, 2));

        setStatus('sent');
        
        // Reset status after 5 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 5000);
      } catch (error: any) {
        console.error('Failed to send verification email:', error);
        if (error.response) {
          console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
          console.error('Error response status:', error.response.status);
          console.error('Error response headers:', JSON.stringify(error.response.headers, null, 2));
        }
        setStatus('error');
      }
    };

    return (
      <Flex direction="column" gap="2" mt="2">
        <Text size="2" color="orange">
          Please verify your email address to access all features
        </Text>
        {status === 'idle' && (
          <RadixLink 
            size="2" 
            onClick={handleResendVerification}
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
          >
            Resend verification email
          </RadixLink>
        )}
        {status === 'sending' && (
          <Text size="2" color="gray">
            Sending...
          </Text>
        )}
        {status === 'sent' && (
          <Text size="2" color="green">
            Verification email sent. Please check your inbox.
          </Text>
        )}
        {status === 'error' && (
          <Flex direction="column" gap="2">
            <Text size="2" color="red">
              Failed to send verification email. Please try again.
            </Text>
            <RadixLink 
              size="2" 
              onClick={handleResendVerification}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              Resend verification email
            </RadixLink>
          </Flex>
        )}
      </Flex>
    );
  }

  return (
    <Text size="2" color="green" mt="2">
      Email verified successfully
    </Text>
  );
} 