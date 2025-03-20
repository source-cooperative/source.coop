'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { initLoginFlow, getLoginFlow } from '@/lib/auth';

// Use the environment variable if available, otherwise fallback to default
const ORY_URL = process.env.NEXT_PUBLIC_ORY_BASE_URL || "https://playground.projects.oryapis.com";

export function LoginForm() {
  const router = useRouter();
  const [flowId, setFlowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const initFlow = async () => {
      setLoading(true);
      try {
        console.log("Starting login flow initialization from client");
        
        // Try to initialize flow directly via Ory if in client
        if (typeof window !== 'undefined') {
          try {
            console.log("Attempting direct Ory login flow initialization");
            const response = await fetch(`${ORY_URL}/self-service/login/browser`, {
              method: "GET",
              redirect: "manual",
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
              }
            });
            
            // Check for redirect response
            if (response.status === 302 || response.status === 303) {
              const location = response.headers.get('location');
              if (location) {
                const url = new URL(location);
                const directFlowId = url.searchParams.get("flow");
                if (directFlowId) {
                  console.log("Directly obtained flow ID:", directFlowId);
                  setFlowId(directFlowId);
                  setError(null);
                  setLoading(false);
                  return;
                }
              }
            }
            
            console.log("Direct initialization didn't return usable flow ID, falling back to server method");
          } catch (directErr) {
            console.warn("Direct initialization attempt failed:", directErr);
            // Continue with server method
          }
        }
        
        // Fall back to server method
        const newFlowId = await initLoginFlow();
        console.log("Login flow ID received from server:", newFlowId);
        
        if (!newFlowId) {
          throw new Error('Failed to initialize login flow - no flow ID received');
        }
        
        // Store the flow ID even before verification
        setFlowId(newFlowId);
        
        try {
          // Try to verify the flow ID, but don't fail if this doesn't work
          console.log("Attempting to verify flow ID");
          const flowDetails = await getLoginFlow(newFlowId);
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
        console.error('Failed to initialize login flow:', err);
        setError('Could not initialize login. Please try again or contact support if the issue persists.');
      } finally {
        setLoading(false);
      }
    };

    initFlow();
  }, []);

  // Fallback method to directly handle Ory browser flow
  const handleRetryLogin = () => {
    // Use Ory's official browser flow that handles redirects automatically
    window.location.href = `${ORY_URL}/self-service/login/browser`;
  };

  const handleDirectSubmit = (formData: FormData) => {
    // Direct form submission by creating a form and submitting it
    if (!flowId) {
      handleRetryLogin();
      return;
    }
    
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${ORY_URL}/self-service/login?flow=${flowId}`;
    
    // Add method
    const methodInput = document.createElement('input');
    methodInput.type = 'hidden';
    methodInput.name = 'method';
    methodInput.value = 'password';
    form.appendChild(methodInput);
    
    // Add email
    const emailInput = document.createElement('input');
    emailInput.type = 'hidden';
    emailInput.name = 'identifier';
    emailInput.value = formData.get('identifier') as string;
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
      setError('Login flow not initialized. Please refresh the page and try again.');
      return;
    }

    setSubmitLoading(true);
    
    try {
      console.log("Getting login flow for submission, ID:", flowId);
      // Get flow data to find the action URL
      const flow = await getLoginFlow(flowId);
      
      if (!flow) {
        console.log("Could not get flow details, trying direct submission");
        handleDirectSubmit(new FormData(event.currentTarget));
        return;
      }
      
      // Ensure we have a valid action URL
      if (!flow.ui?.action) {
        console.log("No action URL found, trying direct submission");
        handleDirectSubmit(new FormData(event.currentTarget));
        return;
      }
      
      console.log("Submitting to:", flow.ui.action, "with method:", flow.ui.method);
      
      const formData = new FormData(event.currentTarget);
      
      const response = await fetch(flow.ui.action, {
        method: flow.ui.method,
        body: formData,
        credentials: 'include',
        redirect: 'manual',
      });
      
      // Log response status for debugging
      console.log("Login submission response status:", response.status);
      
      // Check for different response types
      if (response.status >= 400) {
        // If there's an error, get the updated flow with error messages
        console.log("Error response received, getting flow for error details");
        const updatedFlow = await getLoginFlow(flowId);
        
        if (updatedFlow?.ui?.messages?.length > 0) {
          const errorMessage = updatedFlow.ui.messages[0].text;
          console.error("Login error message:", errorMessage);
          setError(errorMessage);
        } else {
          console.error("Login failed with status:", response.status);
          setError('Login failed. Please check your credentials and try again.');
        }
      } else {
        // Check location header for redirect
        const location = response.headers.get('location');
        console.log("Successful login, redirect to:", location);
        
        // Redirect to home page after successful login
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again later.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && !flowId) {
    return <Text>Loading login form...</Text>;
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
            onClick={handleRetryLogin}
          >
            Try alternative login method
          </Button>
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
                className="px-4 py-3 text-lg rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
                style={{ fontSize: 'var(--font-size-3)' }}
              />
            </Form.Control>
            <Form.Message className="FormMessage" match="valueMissing">
              <Text color="red" size="1">Please enter your password</Text>
            </Form.Message>
          </Flex>
        </Form.Field>
        
        <input type="hidden" name="method" value="password" />
        <input type="hidden" name="csrf_token" value={flowId || ''} />
        
        <Flex mt="4" justify="end">
          <Form.Submit asChild>
            <Button size="3" type="submit" disabled={loading || submitLoading}>
              {submitLoading ? 'Logging in...' : 'Log in'}
            </Button>
          </Form.Submit>
        </Flex>
      </Flex>
    </Form.Root>
  );
} 