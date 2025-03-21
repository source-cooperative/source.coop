'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { Configuration, FrontendApi, UpdateRegistrationFlowBody } from '@ory/client';
import { oryBrowserClient } from '@/lib/ory';

export function RegistrationForm() {
  const router = useRouter();
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Initialize registration flow on component mount
  useEffect(() => {
    const initFlow = async () => {
      setLoading(true);
      try {
        const { data } = await oryBrowserClient.createBrowserRegistrationFlow();
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
      setError('Registration flow not initialized. Please refresh the page and try again.');
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;
    const passwordConfirm = formData.get('password_confirm') as string;

    // Check if passwords match
    if (password !== passwordConfirm) {
      setPasswordsMatch(false);
      return;
    }
    
    setPasswordsMatch(true);
    setSubmitLoading(true);
    
    try {
      // Convert FormData to the format Ory expects
      const body: UpdateRegistrationFlowBody = {
        method: 'password' as const,
        password: password,
        traits: {
          email: formData.get('traits.email') as string,
        },
        csrf_token: flow.ui.nodes.find(
          (n: any) => n.attributes?.name === 'csrf_token'
        )?.attributes?.value,
      };

      await oryBrowserClient.updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: body,
      });

      router.push('/onboarding');
    } catch (err) {
      console.error('Registration error details:', {
        error: err,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        flowId: flow?.id,
        hasCSRFToken: !!flow?.ui?.nodes?.find(
          (n: any) => n.attributes?.name === 'csrf_token'
        )?.attributes?.value
      });
   
      // Refresh the flow if it expired
      if (err.response?.status === 410) {
        const { data } = await oryBrowserClient.createBrowserRegistrationFlow();
        setFlow(data);
      }
      setError('An error occurred during registration. Please try again.');
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