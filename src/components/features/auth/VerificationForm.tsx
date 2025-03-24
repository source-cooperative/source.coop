'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Flex, Text, Box, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { ory } from '@/lib/ory';
import { useAuth } from '@/hooks/useAuth';

export function VerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const initFlow = async () => {
      try {
        // Get the code from URL if present
        const code = searchParams.get('code');
        const flowId = searchParams.get('flow');

        if (code && flowId) {
          // If we have a code and flow ID, complete the verification
          try {
            await ory.updateVerificationFlow({
              flow: flowId,
              updateVerificationFlowBody: {
                method: 'code',
                code,
                csrf_token: 'auth'
              }
            });
            // Let Ory handle the redirect
            return;
          } catch (err) {
            console.error('Failed to complete verification:', err);
            setError('Failed to verify email. Please try again.');
          }
        } else {
          // Create a new verification flow
          const { data } = await ory.createBrowserVerificationFlow({
            returnTo: 'http://localhost:3000/onboarding'
          });
          setFlow(data);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to initialize verification flow:', err);
        setError('Could not initialize verification. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initFlow();
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!flow) {
      setError('Verification flow not initialized. Please refresh the page and try again.');
      return;
    }

    setSubmitLoading(true);
    
    try {
      const formData = new FormData(event.currentTarget);
      const code = formData.get('code') as string;

      // Get the CSRF token from the flow
      const csrfToken = flow.ui.nodes?.find(
        (node: any) => node.attributes?.name === 'csrf_token'
      )?.attributes?.value;

      // Use Ory SDK to update the verification flow
      const response = await ory.updateVerificationFlow({
        flow: flow.id,
        updateVerificationFlowBody: {
          method: 'code',
          code,
          csrf_token: csrfToken,
        },
      });

      // Check if we have a redirect URL in the response
      if (response.data?.return_to) {
        console.log('Redirecting to return_to URL:', response.data.return_to);
        // Don't use the return_to URL directly, as it might point to localhost:4000
        router.push('/onboarding');
      } else {
        // Default to onboarding if no redirect URL
        console.log('No redirect URL, going to onboarding');
        router.push('/onboarding');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      if (err.response?.data?.ui?.messages) {
        // Handle Ory UI messages
        const messages = err.response.data.ui.messages;
        setError(messages[0]?.text || 'Verification failed. Please try again.');
      } else {
        setError('An error occurred during verification. Please try again.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Flex direction="column" gap="3" align="center">
        <Text>Loading verification form...</Text>
      </Flex>
    );
  }

  // Error state
  if (error) {
    return (
      <Flex direction="column" gap="3">
        <Text color="red">{error}</Text>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </Flex>
    );
  }

  // No flow data
  if (!flow) {
    return (
      <Flex direction="column" gap="3">
        <Text>Could not load verification form. Please refresh the page.</Text>
        <Button onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </Flex>
    );
  }

  return (
    <Form.Root onSubmit={handleSubmit}>
      {error && (
        <Box mb="4">
          <Text color="red" size="2">{error}</Text>
          <Flex gap="2" mt="2">
            <Button 
              size="1" 
              variant="soft" 
              color="gray" 
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </Flex>
        </Box>
      )}

      <Flex direction="column" gap="4">
        <Form.Field name="code">
          <Flex direction="column" gap="1">
            <Form.Label>
              <Text size="3" weight="medium">Verification Code</Text>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root 
                type="text" 
                name="code"
                placeholder="Enter the code from your email"
                required
                size="3"
                variant="surface"
                style={{ fontFamily: 'var(--code-font-family)' }}
                autoFocus
              />
            </Form.Control>
            <Form.Message className="FormMessage" match="valueMissing">
              <Text color="red" size="1">Please enter the verification code</Text>
            </Form.Message>
          </Flex>
        </Form.Field>

        <Flex mt="4" justify="end">
          <Form.Submit asChild>
            <Button size="3" type="submit" disabled={submitLoading}>
              {submitLoading ? 'Verifying...' : 'Verify Email'}
            </Button>
          </Form.Submit>
        </Flex>
      </Flex>
    </Form.Root>
  );
} 