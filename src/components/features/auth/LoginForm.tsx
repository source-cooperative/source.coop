'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { initLoginFlow, getLoginFlow } from '@/lib/auth';

// The Ory service URL (using the environment variable)
const ORY_URL = process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4000';

// Helper to get absolute URLs for API calls if needed
function getApiUrl(path: string) {
  return path; // In client components, relative URLs work fine
}

// Use the server-side API routes instead of direct Ory access
export function LoginForm() {
  const router = useRouter();
  const [flowId, setFlowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isCsrfError, setIsCsrfError] = useState(false);
  // Add ref to track initialization status
  const isInitializing = useRef(false);

  useEffect(() => {
    const initFlow = async () => {
      // Prevent duplicate initializations
      if (isInitializing.current) {
        console.log("Login flow initialization already in progress, skipping");
        return;
      }
      
      isInitializing.current = true;
      setLoading(true);
      
      try {
        console.log("Starting login flow initialization");
        
        // First try the server-side method
        let newFlowId = await initLoginFlow();
        console.log("Login flow ID received from server:", newFlowId);
        
        // If server-side method fails, try the API endpoint
        if (!newFlowId) {
          console.log("Server-side method failed, trying API endpoint");
          try {
            const response = await fetch('/api/auth/login');
            if (response.ok) {
              const data = await response.json();
              newFlowId = data.flowId;
              console.log("Login flow ID received from API:", newFlowId);
            } else {
              console.error("API endpoint failed:", await response.text());
            }
          } catch (apiErr) {
            console.error("Error calling API endpoint:", apiErr);
          }
        }
        
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
        isInitializing.current = false;
      }
    };

    initFlow();
    
    // Cleanup function
    return () => {
      isInitializing.current = false;
    };
  }, []);

  // Fallback method to handle login issues
  const handleRetryLogin = () => {
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
      setError('Login flow not initialized. Please refresh the page and try again.');
      return;
    }

    setSubmitLoading(true);
    
    try {
      console.log("Getting login flow for submission, ID:", flowId);
      // Get the flow data for the current flow ID
      let flow;
      
      try {
        flow = await getLoginFlow(flowId);
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
      
      const formData = new FormData(event.currentTarget);
      
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
      console.log("Submitting to:", flow.ui.action);
      const response = await fetch(flow.ui.action, {
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
      console.log("Login submission response status:", response.status);
      
      // Check for different response types
      if (response.status >= 400) {
        // If there's an error, check if it's a CSRF error
        let errorText = '';
        try {
          const errorData = await response.json();
          console.error("Login error data:", errorData);
          
          // Check for CSRF error specifically
          if (errorData.error?.id === 'security_csrf_violation') {
            setError('Security verification failed. Please clear your cookies and try again.');
            setIsCsrfError(true);
            return;
          }
          
          errorText = errorData.error?.message || 'Login failed. Please try again.';
        } catch (e) {
          errorText = 'Login failed. Please try again.';
        }
        
        setError(errorText);
      } else {
        // For successful login (usually 200, 201, or 302 status codes)
        console.log("Successful login detected");
        
        // Add delay to ensure Ory session is properly established
        setTimeout(async () => {
          try {
            // Check if the user needs to complete onboarding
            const sessionApiUrl = getApiUrl('/api/auth/session');
            const sessionResponse = await fetch(sessionApiUrl, {
              method: 'GET',
              credentials: 'include',
            });
            
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              
              // If the user has no account_id in metadata, they need to complete onboarding
              if (!sessionData?.identity?.metadata_public?.account_id) {
                console.log("User needs to complete onboarding");
                router.push('/onboarding');
              } else {
                // User has completed onboarding, redirect to their profile
                const accountId = sessionData.identity.metadata_public.account_id;
                console.log("User has completed onboarding, redirecting to profile");
                router.push(`/${accountId}`);
              }
            } else {
              // If we can't determine onboarding status, go to home page
              console.log("Could not determine onboarding status, redirecting to home");
              router.push('/');
            }
            
            router.refresh();
          } catch (redirectErr) {
            console.error("Error during redirect after login:", redirectErr);
            // Fallback to home page
            router.push('/');
            router.refresh();
          }
        }, 500);
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
          <Flex gap="2" mt="2">
            <Button 
              size="1" 
              variant="soft" 
              color="gray" 
              onClick={handleRetryLogin}
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
        
        {/* Add method as hidden input */}
        <input type="hidden" name="method" value="password" />
        
        {/* Add CSRF token if available */}
        {flowId && <CsrfTokenField flowId={flowId} />}
        
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

// Helper component to fetch and include CSRF token
function CsrfTokenField({ flowId }: { flowId: string }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const flow = await getLoginFlow(flowId);
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