'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { initRegistrationFlow, getRegistrationFlow } from '@/lib/auth';

// The Ory service URL (using the environment variable)
const ORY_URL = process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000';

// Helper to get absolute URLs for API calls if needed
function getApiUrl(path: string) {
  return path; // In client components, relative URLs work fine
}

// Use the server-side API routes instead of direct Ory access
export function RegistrationForm() {
  const router = useRouter();
  const [flowId, setFlowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isCsrfError, setIsCsrfError] = useState(false);

  useEffect(() => {
    const initFlow = async () => {
      setLoading(true);
      try {
        console.log("Starting registration flow initialization");
        
        // First try the server-side method
        let newFlowId = await initRegistrationFlow();
        console.log("Registration flow ID received from server:", newFlowId);
        
        // If server-side method fails, try the API endpoint
        if (!newFlowId) {
          console.log("Server-side method failed, trying API endpoint");
          try {
            const response = await fetch('/api/auth/register');
            if (response.ok) {
              const data = await response.json();
              newFlowId = data.flowId;
              console.log("Registration flow ID received from API:", newFlowId);
            } else {
              console.error("API endpoint failed:", await response.text());
            }
          } catch (apiErr) {
            console.error("Error calling API endpoint:", apiErr);
          }
        }
        
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

  // Fallback method to handle registration issues
  const handleRetryRegistration = () => {
    // Refresh the page to restart the flow
    window.location.reload();
  };

  // Function to clear cookies for the domain
  const clearCookies = () => {
    // Clear cookies for localhost and the current domain
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.trim().split('=');
      if (name) {
        // Set expiration to past date to delete the cookie
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
    
    console.log("Cookies cleared, reloading page");
    // Reload the page to start fresh
    window.location.reload();
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
      // Always try to get a fresh flow before submission
      let flow;
      
      try {
        flow = await getRegistrationFlow(flowId);
      } catch (flowErr) {
        console.error("Error fetching flow:", flowErr);
        setError('Could not get flow details. Please try again.');
        setSubmitLoading(false);
        return;
      }
      
      if (!flow || !flow.ui?.action) {
        setError('Could not get flow details. Please try again.');
        setSubmitLoading(false);
        return;
      }
      
      // Remove password_confirm as Ory doesn't need it
      formData.delete('password_confirm');
      
      // Add method explicitly
      formData.set('method', 'password');
      
      // Always get a fresh CSRF token from the flow
      const csrfToken = flow.ui.nodes?.find(node => node.attributes?.name === 'csrf_token')?.attributes?.value;
      if (csrfToken) {
        console.log("Found CSRF token, adding to form data");
        formData.set('csrf_token', csrfToken);
      } else {
        console.warn("No CSRF token found in flow");
      }
      
      // Use the action URL provided by Ory, which should point to our local tunnel
      console.log("Original action URL:", flow.ui.action);
      
      // Modify the action URL to use the current origin instead of localhost:4000
      // This keeps all requests on the same origin
      let actionUrl = flow.ui.action;
      try {
        // Parse the original URL
        const actionUrlObj = new URL(flow.ui.action);
        
        // Create a new URL with the current origin but keep the path and search params
        // This will replace localhost:4000 with localhost:3000
        actionUrl = `${window.location.origin}${actionUrlObj.pathname}${actionUrlObj.search}`;
        console.log("Modified action URL to use same origin:", actionUrl);
      } catch (err) {
        console.warn("Could not modify action URL, using original:", err);
      }
      
      console.log("Submitting to:", actionUrl);
      const response = await fetch(actionUrl, {
        method: flow.ui.method,
        body: formData,
        credentials: 'include',
        redirect: 'manual',
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0',
          'Pragma': 'no-cache'
        }
      });
      
      // Log response status for debugging
      console.log("Registration submission response status:", response.status);
      
      // Check for different response types
      if (response.status >= 400) {
        // If there's an error, check if it's a CSRF error
        let errorText = '';
        try {
          const errorData = await response.json();
          console.error("Registration error data:", errorData);
          
          // Check for CSRF error specifically
          if (errorData.error?.id === 'security_csrf_violation') {
            setError('Security verification failed. Please clear your cookies and try again.');
            setIsCsrfError(true);
            return;
          }
          
          errorText = errorData.error?.message || 'Registration failed. Please try again.';
        } catch (e) {
          errorText = 'Registration failed. Please try again.';
        }
        
        setError(errorText);
      } else {
        // For successful registration (usually 200, 201, or 302 status codes)
        console.log("Successful registration detected");
        
        // Add delay to ensure Ory session is properly established
        setTimeout(() => {
          // Redirect to onboarding page
          console.log("Redirecting to onboarding page");
          router.push('/onboarding');
          router.refresh();
        }, 500);
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
          <Flex gap="2" mt="2">
            <Button 
              size="1" 
              variant="soft" 
              color="gray" 
              onClick={handleRetryRegistration}
            >
              Retry
            </Button>
            {isCsrfError && (
              <Button 
                size="1" 
                variant="soft" 
                color="red" 
                onClick={clearCookies}
              >
                Clear Cookies
              </Button>
            )}
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
        
        {/* Add method as hidden input */}
        <input type="hidden" name="method" value="password" />
        
        {/* Add CSRF token if available */}
        {flowId && <CsrfTokenField flowId={flowId} />}
        
        <Flex mt="4" justify="end">
          <Form.Submit asChild>
            <Button size="3" type="submit" disabled={submitLoading}>
              {submitLoading ? 'Registering...' : 'Create Account'}
            </Button>
          </Form.Submit>
        </Flex>
      </Flex>
    </Form.Root>
  );
}

// Helper component to fetch and include CSRF token
function CsrfTokenField({ flowId }: { flowId: string }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const flow = await getRegistrationFlow(flowId);
        const token = flow?.ui.nodes?.find(node => node.attributes?.name === 'csrf_token')?.attributes?.value;
        if (token) {
          console.log("CSRF token fetched for form field");
          setCsrfToken(token);
        }
      } catch (err) {
        console.error("Failed to fetch CSRF token for form field:", err);
      }
    };
    
    fetchCsrfToken();
  }, [flowId]);
  
  if (!csrfToken) return null;
  
  return <input type="hidden" name="csrf_token" value={csrfToken} />;
} 