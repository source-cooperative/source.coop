'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Flex, Text, Box, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { ory, ExtendedSession } from '@/lib/ory';
import { useAuth } from '@/hooks/useAuth';
import { LoginFlow, UiNodeInputAttributes } from '@ory/client';
import { isApiError } from '@/types/auth';

// Type definitions for custom metadata
interface _IdentityMetadataPublic {
  account_id?: string;
  is_admin?: boolean;
}

// Initialize login flow on component mount
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session: _session } = useAuth(); // Prefixed with _ to mark as intentionally unused
  const [flow, setFlow] = useState<LoginFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const initFlow = async () => {
      setLoading(true);
      try {
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
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!flow) {
      setError('Login flow not initialized. Please refresh the page and try again.');
      return;
    }

    setSubmitLoading(true);
    
    try {
      const formData = new FormData(event.currentTarget);
      
      // Find the CSRF token input node
      const csrfNode = flow.ui?.nodes?.find(
        (node) => 
          node.type === 'input' && 
          (node.attributes as UiNodeInputAttributes)?.name === 'csrf_token'
      );
      
      const csrfToken = csrfNode && 
                        csrfNode.attributes.node_type === 'input' ? 
                        (csrfNode.attributes as UiNodeInputAttributes).value : 
                        undefined;
      
      if (!csrfToken) {
        console.error('Missing CSRF token in flow:', {
          hasNodes: !!flow.ui?.nodes,
          nodeCount: flow.ui?.nodes?.length
        });
        throw new Error('Missing CSRF token');
      }
      
      await ory.updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: {
          method: 'password',
          identifier: formData.get('identifier') as string,
          password: formData.get('password') as string,
          csrf_token: csrfToken,
        },
      });
      
      // Check if login was successful and get account ID for redirect
      try {
        const { data: sessionData } = await ory.toSession();
        const accountId = (sessionData as ExtendedSession)?.identity?.metadata_public?.account_id;
        
        if (accountId) {
          // Check if this is a registration/onboarding completion
          const isRegistration = searchParams?.get('flow') === 'registration' || 
                                searchParams?.get('after_verification_return_to')?.includes('registration');
          
          if (isRegistration) {
            // After registration, redirect to account page
            console.log('Registration completed, redirecting to account page:', `/${accountId}`);
            router.push(`/${accountId}`);
          } else {
            // Normal login, redirect to home
            console.log('Login successful, redirecting to home');
            router.push('/');
          }
        }
      } catch (sessionError) {
        console.error('Failed to get session after login:', sessionError);
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (isApiError(err) && err.response?.data?.ui?.messages) {
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

  // Get CSRF token for the form
  // Using any type here because of incompatibility between LoginFlow type and the actual flow data structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const csrfInputNode = (flow as any).ui?.nodes?.find(
    (node) => 
      node.type === 'input' && 
      (node.attributes as UiNodeInputAttributes)?.name === 'csrf_token'
  );
  const csrfValue = csrfInputNode && csrfInputNode.attributes.node_type === 'input' 
                  ? (csrfInputNode.attributes as UiNodeInputAttributes).value 
                  : undefined;

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
                type="text" 
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
        
        {/* Add the CSRF token with proper null checks */}
        {csrfValue && (
          <input 
            type="hidden" 
            name="csrf_token" 
            value={csrfValue} 
          />
        )}

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