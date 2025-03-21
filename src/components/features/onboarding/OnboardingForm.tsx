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

export function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const checkUsername = useCallback(
    debounce(async (value: string) => {
      if (!value || value.length < 3) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');
      try {
        const response = await fetch(`/api/accounts/check-username?username=${encodeURIComponent(value)}`);
        const data = await response.json();
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('idle');
      }
    }, 500),
    []
  );

  const handleUsernameChange = (value: string) => {
    const lowercaseValue = value.toLowerCase().replace(/\s+/g, '');
    setUsername(lowercaseValue);
    checkUsername(lowercaseValue);
  };

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

      const responseData = await response.json();
      
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

  const fields: FormField[] = [
    {
      name: 'account_id',
      label: 'Username',
      type: 'text',
      required: true,
      placeholder: 'Choose a username',
      validation: {
        minLength: 3,
        pattern: '^[a-z0-9_-]+$'
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
                usernameStatus === 'checking' 
                  ? 'gray' 
                  : usernameStatus === 'available'
                    ? 'green'
                    : usernameStatus === 'taken'
                      ? 'red'
                      : 'gray'
              }
            >
              {username}
            </MonoText>
          </Flex>
          <div style={{ height: '16px' }}>
            {usernameStatus === 'checking' ? (
              <Text size="1" color="gray">Checking availability…</Text>
            ) : usernameStatus !== 'idle' && (
              <Text size="1" color={usernameStatus === 'available' ? 'green' : 'red'}>
                {usernameStatus === 'available' ? 'Username is available' : 'This username is already taken'}
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
        isLoading={loading}
        submitDisabled={usernameStatus === 'taken' || usernameStatus === 'checking'}
      />
    </Box>
  );
} 