'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { Configuration, FrontendApi } from '@ory/client';

// Initialize the Ory client with the correct basePath
const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000',
    baseOptions: {
      withCredentials: true,
    }
  })
);

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
        console.log("Initializing registration flow...");
        const { data } = await ory.createBrowserRegistrationFlow();
        console.log("Registration flow initialized:", data.id);
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
      // Remove password_confirm as Ory doesn't need it
      formData.delete('password_confirm');
      
      // Add method explicitly
      formData.set('method', 'password');
      
      // Important: Use the action URL directly from the flow
      // DO NOT modify the URL - this is the key fix
      const actionUrl = flow.ui.action;
      console.log("Submitting to:", actionUrl);
      
      const response = await fetch(actionUrl, {
        method: flow.ui.method,
        body: formData,
        credentials: 'include',
        redirect: 'manual'
      });
      
      console.log("Registration submission response status:", response.status);
      
      if (response.status >= 400) {
        let errorText = 'Registration failed. Please try again.';
        try {
          const errorData = await response.json();
          errorText = errorData.error?.message || errorText;
        } catch (e) {
          // Use default error message
        }
        setError(errorText);
      } else {
        console.log("Successful registration detected");
        console.log("Redirecting to onboarding page");
        router.push('/onboarding');
        router.refresh();
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred during registration. Please try again later.');
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

  // Find the CSRF token and important input fields
  const csrfToken = flow.ui.nodes?.find(
    (node: any) => node.attributes?.name === 'csrf_token'
  )?.attributes?.value;

  // Registration form
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

        {/* Add method as hidden input */}
        <input type="hidden" name="method" value="password" />
        
        {/* Add CSRF token if available */}
        {csrfToken && <input type="hidden" name="csrf_token" value={csrfToken} />}

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