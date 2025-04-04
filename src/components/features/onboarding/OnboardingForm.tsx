'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Flex, Text, Box, Callout } from '@radix-ui/themes';
import { MonoText } from '@/components/core/MonoText';
import { FormWrapper } from '@/components/core/Form';
import { FormField } from '@/types/form';
import debounce from 'lodash/debounce';
import { FrontendApi, Configuration } from '@ory/client';
import { InfoCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { VerificationSuccessCallout } from '@/components/features/auth/VerificationSuccessCallout';
import { recordVerificationTimestamp } from '@/app/actions/account';
import { CONFIG } from "@/lib/config";

interface OnboardingFormData {
  account_id: string;
  name: string;
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

interface UsernameCheckResponse {
  available: boolean;
}

interface OnboardingResponse {
  success: boolean;
  error?: string;
}

export function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [formData, setFormData] = useState<OnboardingFormData>({
    account_id: '',
    name: ''
  });
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified'>('pending');

  // Initialize Ory client with useMemo to prevent recreation on each render
  const ory = useMemo(
    () =>
      new FrontendApi(
        new Configuration({
          basePath: CONFIG.auth.publicBaseUrl,
          baseOptions: {
            withCredentials: true,
          },
        })
      ),
    []
  );

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await ory.toSession();
        // If no session, redirect to login
        if (!data) {
          router.push('/login');
        } else {
          // Check email verification status
          const identity = data.identity;
          if (identity?.verifiable_addresses) {
            const emailAddress = identity.verifiable_addresses.find(
              (addr) => addr.via === 'email'
            );
            if (emailAddress?.verified) {
              setVerificationStatus('verified');
              
              // Record verification timestamp if coming from email-verified page
              const isFromVerification = window.location.search.includes('verified=true');
              if (isFromVerification && identity.id) {
                console.log('Recording verification timestamp for identity:', identity.id);
                
                try {
                  await recordVerificationTimestamp(identity.id);
                  console.log('Successfully recorded verification timestamp');
                } catch (err) {
                  console.error('Error recording verification timestamp:', err);
                }
              }
            }
          }
          
          // Pre-fill email if available
          if (identity?.traits?.email) {
            console.log('Session found, email:', identity.traits.email);
          }
        }
      } catch (err) {
        console.error('Session error:', err);
        router.push('/login');
      }
    };

    checkSession();
  }, [router, ory]);

  const checkUsername = useCallback(
    async (value: string) => {
      if (!value || value.length < 3) {
        setUsernameStatus('idle');
        return;
      }

      setUsernameStatus('checking');
      try {
        const response = await fetch(`/api/accounts/check-username?username=${encodeURIComponent(value)}`);
        const data: UsernameCheckResponse = await response.json();
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameStatus('idle');
      }
    },
    []
  );

  // Use the debounced version
  const debouncedCheckUsername = useMemo(() => 
    debounce((value: string) => checkUsername(value), 500),
    [checkUsername]
  );

  // Update username display and trigger check
  useEffect(() => {
    if (formData.account_id) {
      setUsername(formData.account_id);
      debouncedCheckUsername(formData.account_id);
    }
  }, [formData.account_id, debouncedCheckUsername]);

  const handleSubmit = async (_data: Record<string, any>) => {
    const data = _data as OnboardingFormData; // TODO: Find more elegant way to do this
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

      // Get the current session to ensure we have the Ory ID
      const { data: sessionData } = await ory.toSession();
      
      if (!sessionData?.identity?.id) {
        throw new Error('No active session found');
      }

      // Submit to API with Ory ID from session
      const responseData = await fetch('/api/accounts/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          account_id,
          name,
          ory_id: sessionData.identity.id,
          email: sessionData.identity.traits.email
        }),
      });

      const responseJson: OnboardingResponse = await responseData.json();
      
      if (!responseData.ok) {
        throw new Error(responseJson.error || 'Failed to complete onboarding');
      }

      // On success, redirect to profile page
      router.push(`/${account_id}?welcome=true`);
      router.refresh();
    } catch (err: unknown) {
      console.error('Onboarding error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
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
      defaultValue: formData.account_id,
      onChange: (value) => {
        // Process the username value (lowercase and remove spaces)
        const processedValue = value.toLowerCase().replace(/\s+/g, '');
        setFormData(prev => ({
          ...prev,
          account_id: processedValue
        }));
      },
      description: (
        <Flex direction="column" gap="1" style={{ minHeight: '24px' }}>
          <Flex gap="1" align="center">
            <Text size="1" color="gray">
              This will be your profile URL:
            </Text>
            <Flex gap="0" align="center">
              <MonoText size="1" color="gray">
                source.coop/
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
      defaultValue: formData.name,
      onChange: (value) => {
        setFormData(prev => ({
          ...prev,
          name: value
        }));
      },
      description: 'This is the name that will be displayed on your profile'
    }
  ];

  return (
    <Box pt="6">
      <Box mb="4">
        <VerificationSuccessCallout />
        {verificationStatus === 'verified' ? (
          // Don't show a second verification message if VerificationSuccessCallout is displayed
          window.location.search.includes('verified=true') ? null : (
            <Callout.Root color="green">
              <Callout.Icon>
                <CheckCircledIcon />
              </Callout.Icon>
              <Callout.Text>
                Your email has been verified successfully!
              </Callout.Text>
            </Callout.Root>
          )
        ) : (
          <Callout.Root color="blue">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Please check your email. We&apos;ve sent you a code to verify your email address.
            </Callout.Text>
          </Callout.Root>
        )}
      </Box>
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