'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Flex, Text, Box } from '@radix-ui/themes';
import { MonoText } from '@/components/core/MonoText';
import { FormWrapper } from '@/components/core/Form';
import { FormField } from '@/types/form';
import debounce from 'lodash/debounce';

interface OnboardingFormData {
  account_id: string;
  name: string;
}

interface UsernameCheckResponse {
  available: boolean;
  error?: string;
}

interface OnboardingResponse {
  success: boolean;
  error?: string;
}

interface UseUsernameCheck {
  username: string;
  usernameAvailable: boolean | null;
  isCheckingUsername: boolean;
  error: string | null;
  checkUsername: (username: string) => void;
  setUsername: (username: string) => void;
}

function useUsernameCheck(): UseUsernameCheck {
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUsername = useCallback(
    debounce(async (username: string) => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      
      setIsCheckingUsername(true);
      try {
        const response = await fetch(`/api/accounts/check-username?username=${encodeURIComponent(username)}`);
        const data: UsernameCheckResponse = await response.json();
        setUsernameAvailable(data.available);
        
        if (!data.available && data.error) {
          setError(data.error);
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameAvailable(null);
        setError('Failed to check username availability');
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500),
    []
  );

  return {
    username,
    usernameAvailable,
    isCheckingUsername,
    error,
    checkUsername,
    setUsername,
  };
}

export function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    username,
    usernameAvailable,
    isCheckingUsername,
    checkUsername,
    setUsername,
  } = useUsernameCheck();

  const handleSubmit = async (data: OnboardingFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { account_id, name } = data;

      // Basic validation
      if (!account_id || account_id.length < 3) {
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
          account_id,
          name,
        }),
      });

      const responseData: OnboardingResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to complete onboarding');
      }

      // On success, redirect to profile page
      router.push(`/${account_id}`);
      router.refresh();
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    checkUsername(value);
  };

  const fields: FormField[] = [
    {
      name: 'account_id',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'Choose a username',
      validation: {
        minLength: 3,
        pattern: '^[a-zA-Z0-9_-]+$'
      },
      onChange: handleUsernameChange,
      description: (
        <Flex direction="column" gap="1" style={{ minHeight: '24px' }}>
          <Flex gap="0" align="center">
            <MonoText size="1" color="gray">
              This will be your profile URL: source.coop/
            </MonoText>
            <MonoText 
              size="1" 
              color={
                isCheckingUsername 
                  ? 'gray' 
                  : usernameAvailable === null 
                    ? 'gray' 
                    : usernameAvailable 
                      ? 'green' 
                      : 'red'
              }
            >
              {username}
            </MonoText>
          </Flex>
          <div style={{ height: '16px' }}>
            {isCheckingUsername ? (
              <Text size="1" color="gray">Checking availability…</Text>
            ) : usernameAvailable !== null && (
              <Text size="1" color={usernameAvailable ? 'green' : 'red'}>
                {usernameAvailable ? 'Username is available' : 'This username is already taken'}
              </Text>
            )}
          </div>
        </Flex>
      )
    },
    {
      name: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      placeholder: 'Your Name',
      validation: {
        minLength: 2
      },
      description: 'This is the name that will be displayed on your profile'
    }
  ];

  return (
    <Box style={{ paddingTop: '32px' }}>
      <FormWrapper
        fields={fields}
        onSubmit={handleSubmit}
        submitLabel="Complete Profile"
        error={error}
        isLoading={loading || usernameAvailable === false || isCheckingUsername}
      />
    </Box>
  );
} 