'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box } from '@radix-ui/themes';
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

export function LoginForm() {
  const router = useRouter();
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Initialize login flow on component mount
  useEffect(() => {
    const initFlow = async () => {
      setLoading(true);
      try {
        console.log("Initializing login flow...");
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
      
      console.log("Login submission response status:", response.status);
      
      if (response.status >= 400) {
        let errorText = 'Login failed. Please try again.';
        try {
          const errorData = await response.json();
          errorText = errorData.error?.message || errorText;
        } catch (e) {
          // Use default error message
        }
        setError(errorText);
      } else {
        console.log("Successful login detected");
        
        // Use Ory SDK to check session and redirect accordingly
        try {
          const { data: session } = await ory.toSession();
          
          // Check if the user has completed onboarding
          if (!session?.identity?.metadata_public?.account_id) {
            console.log("User needs to complete onboarding");
            router.push('/onboarding');
          } else {
            // User has completed onboarding, redirect to their profile
            const accountId = session.identity.metadata_public.account_id;
            console.log("User has completed onboarding, redirecting to profile");
            router.push(`/${accountId}`);
          }
          
          router.refresh();
        } catch (sessionErr) {
          console.error("Error getting session after login:", sessionErr);
          // Default to home page on error
          router.push('/');
          router.refresh();
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again later.');
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
              <input 
                type="email" 
                name="identifier" 
                placeholder="you@example.com"
                required
                className="px-4 py-3 text-lg rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 font-mono"
                style={{ fontSize: 'var(--font-size-3)' }}
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
              <input 
                type="password" 
                name="password"
                placeholder="********"
                required
                className="px-4 py-3 text-lg rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200 font-mono"
                style={{ fontSize: 'var(--font-size-3)' }}
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