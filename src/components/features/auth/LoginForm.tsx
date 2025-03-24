'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { ory, ExtendedSession } from '@/lib/ory';
import { useAuth } from '@/hooks/useAuth';

// Type definitions for custom metadata
interface IdentityMetadataPublic {
  account_id?: string;
  is_admin?: boolean;
}

// Initialize login flow on component mount
export function LoginForm() {
  const router = useRouter();
  const { session } = useAuth();
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const initFlow = async () => {
      setLoading(true);
      try {
        // If user is already logged in, redirect to appropriate page
        if (session?.identity) {
          const accountId = session.identity.metadata_public?.account_id;
          if (!accountId) {
            router.push('/onboarding');
          } else {
            router.push(`/${accountId}`);
          }
          return;
        }
        
        // Simple flow initialization with no additional parameters
        const { data } = await ory.createBrowserLoginFlow();
        setFlow(data);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize login flow:', err);
        setError('Could not initialize login. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initFlow();
  }, [router, session]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!flow) {
      setError('Login flow not initialized. Please refresh the page and try again.');
      return;
    }

    setSubmitLoading(true);
    
    try {
      const formData = new FormData(event.currentTarget);
      
      // Get the CSRF token from the flow
      const csrfToken = flow.ui.nodes?.find(
        (node: any) => node.attributes?.name === 'csrf_token'
      )?.attributes?.value;

      // Use Ory SDK to update the login flow
      const { data: updatedFlow } = await ory.updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: {
          method: 'password',
          identifier: formData.get('identifier') as string,
          password: formData.get('password') as string,
          csrf_token: csrfToken,
        },
      });

      // Check if the login was successful
      if (updatedFlow?.session) {
        const session = updatedFlow.session as ExtendedSession;
        const accountId = session.identity?.metadata_public?.account_id;
        if (!accountId) {
          router.push('/onboarding');
        } else {
          router.push(`/${accountId}`);
        }
        router.refresh();
      } else {
        throw new Error('No session established after login');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.data?.ui?.messages) {
        // Handle Ory UI messages
        const messages = err.response.data.ui.messages;
        setError(messages[0]?.text || 'Login failed. Please try again.');
      } else {
        setError('An error occurred during login. Please try again.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Flex direction="column" gap="3" align="center">
        <Text>Loading login form...</Text>
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
        <Text>Could not load login form. Please refresh the page.</Text>
        <Button onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </Flex>
    );
  }

  // Find the CSRF token
  const csrfToken = flow.ui.nodes?.find(
    (node: any) => node.attributes?.name === 'csrf_token'
  )?.attributes?.value;

  // Login form
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
        <Form.Field name="identifier">
          <Flex direction="column" gap="1">
            <Form.Label>
              <Text size="3" weight="medium">Email</Text>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root 
                type="email" 
                name="identifier" 
                placeholder="you@example.com"
                required
                size="3"
                variant="surface"
                style={{ fontFamily: 'var(--code-font-family)' }}
                autoFocus
              />
            </Form.Control>
            <Form.Message className="FormMessage" match="valueMissing">
              <Text color="red" size="1">Please enter your email</Text>
            </Form.Message>
            <Form.Message className="FormMessage" match="typeMismatch">
              <Text color="red" size="1">Please enter a valid email address</Text>
            </Form.Message>
          </Flex>
        </Form.Field>

        <Form.Field name="password">
          <Flex direction="column" gap="1">
            <Form.Label>
              <Text size="3" weight="medium">Password</Text>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root 
                type="password" 
                name="password"
                placeholder="********"
                required
                size="3"
                variant="surface"
                style={{ fontFamily: 'var(--code-font-family)' }}
              />
            </Form.Control>
            <Form.Message className="FormMessage" match="valueMissing">
              <Text color="red" size="1">Please enter your password</Text>
            </Form.Message>
          </Flex>
        </Form.Field>

        {/* Add method as hidden input */}
        <input type="hidden" name="method" value="password" />
        
        {/* Add CSRF token if available */}
        {csrfToken && <input type="hidden" name="csrf_token" value={csrfToken} />}

        <Flex mt="4" justify="end">
          <Form.Submit asChild>
            <Button size="3" type="submit" disabled={submitLoading}>
              {submitLoading ? 'Logging in...' : 'Log in'}
            </Button>
          </Form.Submit>
        </Flex>
      </Flex>
    </Form.Root>
  );
} 