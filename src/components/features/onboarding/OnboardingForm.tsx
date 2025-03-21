'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Flex, Text, Box, TextField } from '@radix-ui/themes';
import * as Form from '@radix-ui/react-form';
import { MonoText } from '@/components/core/MonoText';

export function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [username, setUsername] = useState('unique_username');

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setIsCheckingUsername(true);
    try {
      const response = await fetch(`/api/accounts/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
      
      if (!data.available && data.error) {
        setError(data.error);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const accountId = formData.get('account_id') as string;
      const name = formData.get('name') as string;

      // Basic validation
      if (!accountId || accountId.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      if (!name || name.length < 2) {
        throw new Error('Name is required');
      }

      // Final username availability check before submission
      if (usernameAvailable === false) {
        throw new Error('Username is not available. Please choose another one.');
      }

      // Submit to API
      const response = await fetch('/api/accounts/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_id: accountId,
          name,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // On success, redirect to profile page
      console.log('Onboarding successful:', data);
      
      // Add a slight delay to ensure state updates are complete
      setTimeout(() => {
        router.push(`/${accountId}`);
        router.refresh();
      }, 300);
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form.Root onSubmit={handleSubmit}>
      {error && (
        <Box mb="4">
          <Text color="red" size="2">{error}</Text>
        </Box>
      )}

      <Flex direction="column" gap="4">
        <Form.Field name="account_id">
          <Flex direction="column" gap="1">
            <Form.Label>
              <Text size="3" weight="medium">Username</Text>
            </Form.Label>
            <Form.Control asChild>
              <input
                type="text"
                name="account_id"
                placeholder="unique_username"
                required
                minLength={3}
                pattern="^[a-zA-Z0-9_-]+$"
                className="px-4 py-3 text-lg rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
                style={{ fontSize: 'var(--font-size-3)', fontFamily: 'var(--code-font-family)' }}
                onChange={(e) => {
                  const value = e.target.value;
                  setUsername(value || 'unique_username');
                  checkUsernameAvailability(value);
                }}
              />
            </Form.Control>
            <Form.Message className="FormMessage" match="valueMissing">
              <Text color="red" size="1">Please choose a username</Text>
            </Form.Message>
            <Form.Message className="FormMessage" match="tooShort">
              <Text color="red" size="1">Username must be at least 3 characters</Text>
            </Form.Message>
            <Form.Message className="FormMessage" match="patternMismatch">
              <Text color="red" size="1">Username can only contain letters, numbers, underscores, and hyphens</Text>
            </Form.Message>
            <Flex direction="column" gap="1" style={{ minHeight: '24px' }}>
              <Flex gap="1" align="center">
                <MonoText size="1" color="gray">
                  This will be your profile URL: source.coop/{username}
                </MonoText>
                {!isCheckingUsername && usernameAvailable !== null && (
                  <Text size="1" color={usernameAvailable ? 'green' : 'red'}>
                    ({usernameAvailable ? 'Username is available' : 'This username is already taken'})
                  </Text>
                )}
              </Flex>
              <div style={{ height: '16px' }}>
                {isCheckingUsername && (
                  <Text size="1" color="gray">Checking availability...</Text>
                )}
              </div>
            </Flex>
          </Flex>
        </Form.Field>

        <Form.Field name="name">
          <Flex direction="column" gap="1">
            <Form.Label>
              <Text size="3" weight="medium">Full Name</Text>
            </Form.Label>
            <Form.Control asChild>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                required
                className="px-4 py-3 text-lg rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
                style={{ fontSize: 'var(--font-size-3)' }}
              />
            </Form.Control>
            <Form.Message className="FormMessage" match="valueMissing">
              <Text color="red" size="1">Please enter your name</Text>
            </Form.Message>
            <Text size="1" color="gray">
              This is the name that will be displayed on your profile
            </Text>
          </Flex>
        </Form.Field>

        <Flex mt="4" justify="end">
          <Form.Submit asChild>
            <Button size="3" type="submit" disabled={loading || usernameAvailable === false || isCheckingUsername}>
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
          </Form.Submit>
        </Flex>
      </Flex>
    </Form.Root>
  );
} 