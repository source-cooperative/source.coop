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
      {/* Hidden CSRF token field */}
      {csrfToken && (
        <input type="hidden" name="csrf_token" value={csrfToken} />
      )}
      
      {/* Email field */}
      <Form.Field name="traits.email">
        <Form.Label>Email</Form.Label>
        <Form.Control asChild>
          <input
            type="email"
            required
            className="w-full p-2 border rounded"
          />
        </Form.Control>
        <Form.Message match="valueMissing">
          Please enter your email
        </Form.Message>
        <Form.Message match="typeMismatch">
          Please enter a valid email
        </Form.Message>
      </Form.Field>
      
      {/* Password field */}
      <Form.Field name="password" className="mt-3">
        <Form.Label>Password</Form.Label>
        <Form.Control asChild>
          <input
            type="password"
            required
            minLength={8}
            className="w-full p-2 border rounded"
          />
        </Form.Control>
        <Form.Message match="valueMissing">
          Please enter a password
        </Form.Message>
        <Form.Message match="tooShort">
          Password must be at least 8 characters
        </Form.Message>
      </Form.Field>
      
      {/* Confirm Password field (client-side only) */}
      <Form.Field name="password_confirm" className="mt-3">
        <Form.Label>Confirm Password</Form.Label>
        <Form.Control asChild>
          <input
            type="password"
            required
            className="w-full p-2 border rounded"
          />
        </Form.Control>
        {!passwordsMatch && (
          <Text size="1" color="red" className="mt-1">
            Passwords do not match
          </Text>
        )}
      </Form.Field>
      
      {/* Submit button */}
      <Form.Submit asChild>
        <Button className="mt-4 w-full" disabled={submitLoading}>
          {submitLoading ? 'Registering...' : 'Register'}
        </Button>
      </Form.Submit>
    </Form.Root>
  );
} 