'use client';

import { Container, Box, Heading, Tabs, Text } from '@radix-ui/themes';
import { Form } from '@/components/core/Form';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { FormField } from '@/components/core/Form';

// Use the Ory tunnel URL for local development
const KRATOS_URL = 'http://localhost:4000';

export default function AuthPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [registrationFlowId, setRegistrationFlowId] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const response = await fetch(`${KRATOS_URL}/sessions/whoami`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          // User is logged in, redirect to home
          router.push('/');
          return;
        }
        // 401 is expected when not logged in, so we don't treat it as an error
        if (response.status !== 401) {
          console.error('Unexpected session check response:', response.status);
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };

    // Create a new registration flow when the page loads
    const createRegistrationFlow = async () => {
      try {
        const response = await fetch(`${KRATOS_URL}/self-service/registration/browser`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to create registration flow');
        }

        const data = await response.json();
        setRegistrationFlowId(data.id);
        
        // Find the CSRF token in the flow
        const csrfNode = data.ui.nodes.find(
          (node: any) => node.attributes && 'name' in node.attributes && node.attributes.name === 'csrf_token'
        );
        if (csrfNode && 'value' in csrfNode.attributes) {
          setCsrfToken(csrfNode.attributes.value);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize registration');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    createRegistrationFlow();
  }, [router]);

  const handleLogin = async (data: Record<string, string>) => {
    try {
      const response = await fetch(`${KRATOS_URL}/self-service/login/browser`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create login flow');
      }

      const flowData = await response.json();
      const loginCsrfToken = flowData.ui.nodes.find(
        (node: any) => node.attributes?.name === 'csrf_token'
      )?.attributes?.value;

      if (!loginCsrfToken) {
        throw new Error('No CSRF token available');
      }

      const loginResponse = await fetch(`${KRATOS_URL}/self-service/login?flow=${flowData.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          method: 'password',
          csrf_token: loginCsrfToken,
          'traits.email': data.email,
          password: data.password,
        }),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.error?.message || 'Login failed');
      }

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleRegister = async (data: Record<string, string>) => {
    try {
      if (!registrationFlowId) {
        throw new Error('No registration flow available. Please try again.');
      }

      if (!csrfToken) {
        throw new Error('No CSRF token available. Please refresh the page and try again.');
      }

      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Debug: Log only non-sensitive request data
      console.log('Registration request data:', {
        method: 'password',
        traits: {
          email: data.email
        }
        // Omitting csrf_token and password for security
      });

      // Submit registration directly to Ory
      const response = await fetch(`${KRATOS_URL}/self-service/registration?flow=${registrationFlowId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          method: 'password',
          csrf_token: csrfToken,
          traits: {
            email: data.email
          },
          password: data.password,
        }),
      });

      // Handle successful registration
      if (response.ok) {
        await response.json(); // Make sure to consume the response
        window.location.replace('/onboarding'); // Force navigation to onboarding
        return;
      }

      // Handle errors
      const errorData = await response.json();
      console.error('Registration error details:', errorData);
      
      // Debug: Log the full response body
      console.log('Error response body:', JSON.stringify(errorData, null, 2));
      
      // Check for UI messages first
      if (errorData.ui?.messages?.length > 0) {
        const errorMessage = errorData.ui.messages[0].text;
        // Remove the sign-in suggestion from the message
        const cleanMessage = errorMessage.replace(/ You can sign in using your password\.$/, '');
        throw new Error(cleanMessage);
      }
      
      // Debug: Log the full response
      console.error('Full error response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorData
      });

      // Check for general error messages
      if (errorData.error?.message) {
        throw new Error(errorData.error.message);
      }

      // If we get here, we didn't find any specific error messages
      throw new Error('Registration failed. Please try again.');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const loginFields: FormField[] = [
    {
      label: 'Email',
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      label: 'Password',
      name: 'password',
      type: 'password',
      required: true,
    },
  ];

  const registerFields: FormField[] = [
    {
      label: 'Email',
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      label: 'Password',
      name: 'password',
      type: 'password',
      required: true,
      description: 'Must be at least 8 characters long',
    },
    {
      label: 'Confirm Password',
      name: 'confirmPassword',
      type: 'password',
      required: true,
    },
  ];

  if (isLoading) {
    return (
      <Container>
        <Box py="9">
          <Text>Loading...</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Box py="9">
        <Heading size="8" mb="6">Welcome to Source</Heading>
        
        <Tabs.Root defaultValue="login">
          <Tabs.List>
            <Tabs.Trigger value="login">Log In</Tabs.Trigger>
            <Tabs.Trigger value="register">Register</Tabs.Trigger>
          </Tabs.List>

          <Box pt="4">
            <Tabs.Content value="login">
              <Form
                fields={loginFields}
                onSubmit={handleLogin}
                submitLabel="Log In"
                description="Log in to your account"
              />
            </Tabs.Content>

            <Tabs.Content value="register">
              <Form
                fields={registerFields}
                onSubmit={handleRegister}
                submitLabel="Create Account"
                description="Create a new account"
              />
            </Tabs.Content>
          </Box>
        </Tabs.Root>

        {error && (
          <Text color="red" mt="4">
            {error}
          </Text>
        )}
      </Box>
    </Container>
  );
} 