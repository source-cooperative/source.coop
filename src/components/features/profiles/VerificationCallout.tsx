'use client';

import { Callout, Link as RadixLink } from '@radix-ui/themes';
import { useState, useEffect } from 'react';
import { ory } from '@/lib/ory';

interface VerificationCalloutProps {
  email: string;
}

interface CsrfAttributes {
  name: string;
  value: string;
  [key: string]: unknown;
}

export function VerificationCallout({ email }: VerificationCalloutProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: session } = await ory.toSession();
        const verified = session.identity?.verifiable_addresses?.some(addr => addr.verified) ?? false;
        setIsVerified(verified);
      } catch (error) {
        console.error('Failed to check verification status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResendVerification = async () => {
    if (verificationStatus !== 'idle') return;
    
    setVerificationStatus('sending');
    try {
      // Create a browser verification flow
      const { data } = await ory.createBrowserVerificationFlow();
      
      // Prepare the verification request object
      const updateBody = {
        email,
        method: 'code' as const
      };
      
      // Find and add CSRF token if present
      if (data.ui && Array.isArray(data.ui.nodes)) {
        const csrfNode = data.ui.nodes.find(node => {
          const attrs = node.attributes as unknown as CsrfAttributes;
          return attrs && attrs.name === 'csrf_token';
        });
        
        if (csrfNode) {
          const attrs = csrfNode.attributes as unknown as CsrfAttributes;
          // Add CSRF token to the request
          const bodyWithCsrf = {
            ...updateBody,
            csrf_token: attrs.value
          };
          
          // Submit the verification request
          await ory.updateVerificationFlow({
            flow: data.id,
            updateVerificationFlowBody: bodyWithCsrf
          });
        } else {
          // Submit without CSRF token if not found
          await ory.updateVerificationFlow({
            flow: data.id,
            updateVerificationFlowBody: updateBody
          });
        }
      } else {
        // Submit without CSRF token if no nodes
        await ory.updateVerificationFlow({
          flow: data.id,
          updateVerificationFlowBody: updateBody
        });
      }
      
      setVerificationStatus('sent');
      
      // Reset status after a delay
      setTimeout(() => {
        setVerificationStatus('idle');
      }, 5000);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      setVerificationStatus('idle');
    }
  };

  if (isVerified) return null;

  return (
    <Callout.Root color="amber" mb="6">
      <Callout.Text>
        <strong>{email}</strong> needs to be verified. 
        Check your inbox and click the verification link to complete the process.
      </Callout.Text>
      <Callout.Text>
        Didn&apos;t receive the email?{' '}
        {verificationStatus === 'sent' ? (
          <span>Email sent! Please check your inbox.</span>
        ) : (
          <RadixLink 
            onClick={handleResendVerification}
            style={{ textDecoration: 'underline', cursor: 'pointer' }}
          >
            {verificationStatus === 'sending' 
              ? 'Sending...' 
              : 'Resend verification email'}
          </RadixLink>
        )}
      </Callout.Text>
    </Callout.Root>
  );
} 