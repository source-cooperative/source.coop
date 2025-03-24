'use client';

import { useState, useEffect } from 'react';
import { Button, Flex, Text, Box } from '@radix-ui/themes';

export default function AuthDebugPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [cookieData, setCookieData] = useState<any>(null);
  const [directFetchResult, setDirectFetchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to check session using our API
  const checkSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setSessionData(data);
    } catch (err) {
      setError(`API session check error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to check cookies
  const checkCookies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/debug/cookies');
      const data = await response.json();
      setCookieData(data);
    } catch (err) {
      setError(`Cookie check error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to check session directly with Ory
  const checkDirectFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use window.location.hostname for consistent domain
      const oryUrl = `http://${window.location.hostname}:4000/sessions/whoami`;
      console.log("Fetching from:", oryUrl);
      
      const response = await fetch(oryUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const status = response.status;
      let data = null;
      
      try {
        data = await response.json();
      } catch (e) {
        // Ignore JSON parsing errors
      }
      
      setDirectFetchResult({
        status,
        data,
        url: oryUrl
      });
    } catch (err) {
      setError(`Direct fetch error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" gap="6" p="6" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Box>
        <Text size="6" weight="bold">Auth Debug Page</Text>
        <Text color="gray">Use this page to diagnose authentication issues</Text>
      </Box>

      {error && (
        <Box p="4" style={{ backgroundColor: '#FFEEEE', borderRadius: '4px' }}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Flex gap="4">
        <Button onClick={checkSession} disabled={loading}>
          Check Session API
        </Button>
        <Button onClick={checkCookies} disabled={loading}>
          Check Cookies
        </Button>
        <Button onClick={checkDirectFetch} disabled={loading}>
          Direct Ory Fetch
        </Button>
      </Flex>

      {loading && <Text>Loading...</Text>}

      {sessionData && (
        <Box>
          <Text size="4" weight="bold">Session Data:</Text>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '1rem', overflow: 'auto', borderRadius: '4px' }}>
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </Box>
      )}

      {cookieData && (
        <Box>
          <Text size="4" weight="bold">Cookie Data:</Text>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '1rem', overflow: 'auto', borderRadius: '4px' }}>
            {JSON.stringify(cookieData, null, 2)}
          </pre>
        </Box>
      )}

      {directFetchResult && (
        <Box>
          <Text size="4" weight="bold">Direct Fetch Result:</Text>
          <Text>Status Code: {directFetchResult.status}</Text>
          <Text>URL: {directFetchResult.url}</Text>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '1rem', overflow: 'auto', borderRadius: '4px' }}>
            {JSON.stringify(directFetchResult.data, null, 2)}
          </pre>
        </Box>
      )}
    </Flex>
  );
} 