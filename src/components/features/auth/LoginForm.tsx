'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { ory } from '@/lib/ory';
import { Session } from '@ory/client';

// Type definitions for custom metadata
interface IdentityMetadataPublic {
  account_id?: string;
  is_admin?: boolean;
}

// Initialize login flow on component mount
export function LoginForm() {
  const router = useRouter();
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const initFlow = async () => {
      setLoading(true);
      try {
        // First check if user is already logged in
        try {
          const { data: session } = await ory.toSession();
          
          if (session) {
            console.log("User already logged in, redirecting");
            // Check if the user has completed onboarding
            const metadata = session.identity?.metadata_public as IdentityMetadataPublic || {};
            if (!metadata.account_id) {
              router.push('/onboarding');
            } else {
              // User has completed onboarding, redirect to their profile
              router.push(`/${metadata.account_id}`);
            }
            return;
          }
        } catch (sessionErr) {
          // This is expected if the user is not logged in
          console.log("No active session, proceeding with login flow");
        }
        
        console.log("Initializing login flow...");
        // Simple login flow initialization
        const { data } = await ory.createBrowserLoginFlow();
        console.log("Login flow initialized:", data.id);
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
  }, [router]);

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

      console.log("Login flow updated:", updatedFlow);
      
      if (updatedFlow?.session) {
        console.log("Successful login detected");
        
        // Check if the user has completed onboarding
        const metadata = updatedFlow.session.identity?.metadata_public as IdentityMetadataPublic || {};
        if (!metadata.account_id) {
          console.log("User needs to complete onboarding");
          router.push('/onboarding');
        } else {
          // User has completed onboarding, redirect to their profile
          console.log("User has completed onboarding, redirecting to profile");
          router.push(`/${metadata.account_id}`);
        }
        
        router.refresh();
      } else {
        throw new Error('No session established after login');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response?.data?.ui?.messages) {
        // Handle Ory UI messages
        const messages = err.response.data.ui.messages;
        setError(messages[0]?.text || 'Login failed. Please try again.');
      } else {
        setError('An error occurred during login. Please try again later.');
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