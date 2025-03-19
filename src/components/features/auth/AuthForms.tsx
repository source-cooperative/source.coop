'use client';

import { Box, Heading, Tabs, Text, Flex } from '@radix-ui/themes';
import { FormWrapper } from '@/components/core';
import type { FormField } from '@/types/form';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CONFIG } from '@/lib/config';

const KRATOS_URL = CONFIG.auth.kratosUrl;

export function AuthForms() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [registrationFlowId, setRegistrationFlowId] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create a new registration flow when the page loads
    const createRegistrationFlow = async () => {
      try {
        const response = await fetch(`${KRATOS_URL}/self-service/registration/browser`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Failed to create registration flow');
        }

        const data = await response.json();
        setRegistrationFlowId(data.id);
        
        const csrfNode = data.ui.nodes.find(
          (node: any) => node.attributes?.name === 'csrf_token'
        );
        if (csrfNode?.attributes?.value) {
          setCsrfToken(csrfNode.attributes.value);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize registration');
      } finally {
        setIsLoading(false);
      }
    };

    createRegistrationFlow();
  }, [router]);

  const handleLogin = async (data: Record<string, string>) => {
    try {
      const response = await fetch(`${KRATOS_URL}/self-service/login/browser`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create login flow');
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

      const responseData = await response.json();

      if (!response.ok) {
        // Log the full error response for debugging
        console.error('Registration error details:', {
          status: response.status,
          error: responseData.error,
          messages: responseData.ui?.messages,
          nodes: responseData.ui?.nodes
        });
        
        // Try to get a user-friendly error message
        const errorMessage = responseData.error?.message || 
                           responseData.ui?.messages?.[0]?.text ||
                           'Registration failed';
        throw new Error(errorMessage);
      }

      // After successful registration, redirect to onboarding
      router.push('/onboarding');
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
      <Box py="9">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box py="9">
      <Heading size="8" mb="6" align="center">Welcome to Source</Heading>
      
      <Flex align="center" justify="center">
        <Box width="9">
          <Tabs.Root defaultValue="login">
            <Tabs.List>
              <Tabs.Trigger value="login">Log In</Tabs.Trigger>
              <Tabs.Trigger value="register">Register</Tabs.Trigger>
            </Tabs.List>

            <Box pt="4">
              <Tabs.Content value="login">
                <FormWrapper
                  fields={loginFields}
                  onSubmit={handleLogin}
                  submitLabel="Log In"
                />
              </Tabs.Content>

              <Tabs.Content value="register">
                <FormWrapper
                  fields={registerFields}
                  onSubmit={handleRegister}
                  submitLabel="Register"
                />
              </Tabs.Content>
            </Box>
          </Tabs.Root>

          {error && (
            <Text color="red" mt="4" align="center">
              {error}
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  );
} 