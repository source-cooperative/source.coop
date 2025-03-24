'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { ory } from '@/lib/ory';
import { useAuth } from '@/hooks/useAuth';

export function RegistrationForm() {
  const router = useRouter();
  const { session } = useAuth();
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const initFlow = async () => {
      setLoading(true);
      try {
        console.log('Initializing registration flow...');
        const { data } = await ory.createBrowserRegistrationFlow({
          returnTo: 'http://localhost:3000/email-verified'
        });
        console.log('Registration flow initialized:', {
          flowId: data.id,
          hasNodes: !!data.ui?.nodes,
          nodeCount: data.ui?.nodes?.length
        });
        setFlow(data);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize registration flow:', err);
        setError('Could not initialize registration. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initFlow();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!flow) {
      console.error('No flow data available');
      setError('Registration flow not initialized. Please refresh the page and try again.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;
    const passwordConfirm = formData.get('password_confirm') as string;
    const email = formData.get('traits.email') as string;

    console.log('Form submission started:', {
      hasEmail: !!email,
      hasPassword: !!password,
      hasPasswordConfirm: !!passwordConfirm,
      flowId: flow.id
    });

    // Check if passwords match
    if (password !== passwordConfirm) {
      console.log('Passwords do not match');
      setPasswordsMatch(false);
      return;
    }
    
    setPasswordsMatch(true);
    setSubmitLoading(true);
    
    try {
      // Get the CSRF token from the flow
      const csrfToken = flow.ui.nodes?.find(
        (node: any) => node.attributes?.name === 'csrf_token'
      )?.attributes?.value;

      console.log('CSRF token:', {
        found: !!csrfToken,
        flowNodes: flow.ui?.nodes?.length
      });

      if (!csrfToken) {
        console.error('Missing CSRF token in flow');
        throw new Error('Missing CSRF token');
      }

      console.log('Submitting registration to Ory...');
      // Submit registration with all required fields
      const response = await ory.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: {
          method: 'password',
          password: password,
          traits: {
            email: email,
          },
          csrf_token: csrfToken,
        },
      });

      console.log('Registration response:', {
        success: true,
        hasData: !!response.data,
        status: response.status,
        headers: response.headers
      });

      // Check if we have a session after successful registration
      if (response.data?.session) {
        console.log('Registration successful, redirecting to onboarding...');
        router.push('/onboarding');
      } else if (response.data?.return_to) {
        console.log('Registration successful with return_to URL:', response.data.return_to);
        // Don't use the return_to URL directly, as it might point to localhost:4000
        router.push('/email-verified');
      } else {
        console.log('Registration successful but no session, redirecting to email verification...');
        router.push('/email-verified');
      }
    } catch (err: any) {
      console.error('Registration error:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        stack: err.stack
      });
      
      if (err.response?.data?.ui?.messages) {
        const messages = err.response.data.ui.messages;
        setError(messages[0]?.text || 'Registration failed. Please try again.');
      } else {
        setError('An error occurred during registration. Please try again.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Flex direction="column" gap="3" align="center">
        <Text>Loading registration form...</Text>
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
        <Text>Could not load registration form. Please refresh the page.</Text>
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
        <Form.Field name="traits.email">
          <Flex direction="column" gap="1">
            <Form.Label>
              <Text size="3" weight="medium">Email</Text>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root 
                type="email" 
                name="traits.email"
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
                minLength={8}
                size="3"
                variant="surface"
                style={{ fontFamily: 'var(--code-font-family)' }}
              />
            </Form.Control>
            <Form.Message className="FormMessage" match="valueMissing">
              <Text color="red" size="1">Please enter a password</Text>
            </Form.Message>
            <Form.Message className="FormMessage" match="tooShort">
              <Text color="red" size="1">Password must be at least 8 characters</Text>
            </Form.Message>
          </Flex>
        </Form.Field>

        <Form.Field name="password_confirm">
          <Flex direction="column" gap="1">
            <Form.Label>
              <Text size="3" weight="medium">Confirm Password</Text>
            </Form.Label>
            <Form.Control asChild>
              <TextField.Root 
                type="password" 
                name="password_confirm"
                placeholder="********"
                required
                size="3"
                variant="surface"
                style={{ fontFamily: 'var(--code-font-family)' }}
              />
            </Form.Control>
            {!passwordsMatch && (
              <Text color="red" size="1">Passwords do not match</Text>
            )}
          </Flex>
        </Form.Field>

        <Flex mt="4" justify="end">
          <Form.Submit asChild>
            <Button size="3" type="submit" disabled={submitLoading}>
              {submitLoading ? 'Registering...' : 'Register'}
            </Button>
          </Form.Submit>
        </Flex>
      </Flex>
    </Form.Root>
  );
} 