'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { initRegistrationFlow, getRegistrationFlow } from '@/lib/auth';

// Use the environment variable if available, otherwise fallback to default
const ORY_URL = process.env.NEXT_PUBLIC_ORY_BASE_URL || "https://playground.projects.oryapis.com";

export function RegistrationForm() {
  const router = useRouter();
  const [flowId, setFlowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const initFlow = async () => {
      setLoading(true);
      try {
        console.log("Starting registration flow initialization");
        const newFlowId = await initRegistrationFlow();
        console.log("Registration flow ID received:", newFlowId);
        
        if (!newFlowId) {
          throw new Error('Failed to initialize registration flow - no flow ID received');
        }
        
        // Store the flow ID even before verification
        setFlowId(newFlowId);
        
        try {
          // Try to verify the flow ID, but don't fail if this doesn't work
          console.log("Attempting to verify flow ID");
          const flowDetails = await getRegistrationFlow(newFlowId);
          if (flowDetails) {
            console.log("Flow verification successful");
          } else {
            console.warn("Flow verification failed, but we'll continue anyway");
          }
        } catch (verifyErr) {
          // Log the error but don't fail the initialization
          console.warn("Flow verification error, but we'll continue anyway:", verifyErr);
        }
        
        setError(null);
      } catch (err) {
        console.error('Failed to initialize registration flow:', err);
        setError('Could not initialize registration. Please try again or contact support if the issue persists.');
      } finally {
        setLoading(false);
      }
    };

    initFlow();
  }, []);

  // Fallback method to directly handle Ory browser flow
  const handleRetryRegistration = () => {
    // Use Ory's official browser flow that handles redirects automatically
    window.location.href = `${ORY_URL}/self-service/registration/browser`;
  };

  const handleDirectSubmit = (formData: FormData) => {
    // Direct form submission by creating a form and submitting it
    if (!flowId) return;
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${ORY_URL}/self-service/registration?flow=${flowId}`;
    
    // Add method
    const methodInput = document.createElement('input');
    methodInput.type = 'hidden';
    methodInput.name = 'method';
    methodInput.value = 'password';
    form.appendChild(methodInput);
    
    // Add email
    const emailInput = document.createElement('input');
    emailInput.type = 'hidden';
    emailInput.name = 'traits.email';
    emailInput.value = formData.get('traits.email') as string;
    form.appendChild(emailInput);
    
    // Add password
    const passwordInput = document.createElement('input');
    passwordInput.type = 'hidden';
    passwordInput.name = 'password';
    passwordInput.value = formData.get('password') as string;
    form.appendChild(passwordInput);
    
    // Submit the form
    document.body.appendChild(form);
    form.submit();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!flowId) {
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
      console.log("Getting registration flow for submission, ID:", flowId);
      // Get flow data to find the action URL
      const flow = await getRegistrationFlow(flowId);
      
      if (!flow) {
        console.log("Could not get flow details, trying direct submission");
        handleDirectSubmit(formData);
        return;
      }
      
      // Ensure we have a valid action URL
      if (!flow.ui?.action) {
        console.log("No action URL found, trying direct submission");
        handleDirectSubmit(formData);
        return;
      }
      
      console.log("Submitting to:", flow.ui.action, "with method:", flow.ui.method);
      
      // Remove password_confirm as Ory doesn't need it
      formData.delete('password_confirm');
      
      const response = await fetch(flow.ui.action, {
        method: flow.ui.method,
        body: formData,
        credentials: 'include',
        redirect: 'manual',
      });
      
      // Log response status for debugging
      console.log("Registration submission response status:", response.status);
      
      // Check for different response types
      if (response.status >= 400) {
        // If there's an error, get the updated flow with error messages
        console.log("Error response received, getting flow for error details");
        const updatedFlow = await getRegistrationFlow(flowId);
        
        if (updatedFlow?.ui?.messages?.length > 0) {
          const errorMessage = updatedFlow.ui.messages[0].text;
          console.error("Registration error message:", errorMessage);
          setError(errorMessage);
        } else {
          console.error("Registration failed with status:", response.status);
          setError('Registration failed. Please check your information and try again.');
        }
      } else {
        // Check location header for redirect
        const location = response.headers.get('location');
        console.log("Successful registration, redirect to:", location);
        
        // Successful registration - redirect to onboarding
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

  if (loading && !flowId) {
    return <Text>Loading registration form...</Text>;
  }

  return (
    <Form.Root onSubmit={handleSubmit}>
      {error && (
        <Box mb="4">
          <Text color="red" size="2">{error}</Text>
          <Button 
            size="1" 
            variant="soft" 
            color="gray" 
            mt="2" 
            onClick={handleRetryRegistration}
          >
            Try alternative registration method
          </Button>
        </Box>
      )}
      
      <Flex direction="column" gap="4">
        <Form.Field name="traits.email">
          <Flex direction="column" gap="1">
            <Form.Label>
              <Text size="3" weight="medium">Email</Text>
            </Form.Label>
            <Form.Control asChild>
              <input 
                type="email" 
                name="traits.email" 
                placeholder="you@example.com"
                required
                className="px-4 py-3 text-lg rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
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
                minLength={8}
                className="px-4 py-3 text-lg rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
                style={{ fontSize: 'var(--font-size-3)' }}
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
              <input 
                type="password" 
                name="password_confirm"
                placeholder="********"
                required
                className="px-4 py-3 text-lg rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
                style={{ fontSize: 'var(--font-size-3)' }}
              />
            </Form.Control>
            <Form.Message className="FormMessage" match="valueMissing">
              <Text color="red" size="1">Please confirm your password</Text>
            </Form.Message>
            {!passwordsMatch && (
              <Text color="red" size="1">Passwords do not match</Text>
            )}
          </Flex>
        </Form.Field>
        
        <input type="hidden" name="method" value="password" />
        <input type="hidden" name="csrf_token" value={flowId || ''} />
        
        <Flex mt="4" justify="end">
          <Form.Submit asChild>
            <Button size="3" type="submit" disabled={loading || submitLoading}>
              {submitLoading ? 'Registering...' : 'Register'}
            </Button>
          </Form.Submit>
        </Flex>
      </Flex>
    </Form.Root>
  );
} 