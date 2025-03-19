'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Box, Text, Card } from '@radix-ui/themes';
import { FormWrapper } from '@/components/core';
import type { FormField } from '@/types/form';
import { CONFIG } from '@/lib/config';

const KRATOS_URL = CONFIG.auth.kratosUrl;

export function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: Record<string, string>) => {
    try {
      console.log('Form submitted with data:', data);
      
      // Get the current session to get the user's ID
      const sessionResponse = await fetch(`${KRATOS_URL}/sessions/whoami`, {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!sessionResponse.ok) {
        console.error('Session check failed:', sessionResponse.status);
        throw new Error('Not logged in');
      }

      const sessionData = await sessionResponse.json();
      console.log('Session data:', sessionData);
      const userId = sessionData.identity.id;

      // Create the account
      const accountData = {
        account_id: data.account_id,
        name: data.name,
        email: sessionData.identity.traits.email,
        ory_id: userId,
      };
      console.log('Sending account data:', accountData);
      
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Account creation failed:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to create account');
      }

      // Update Ory metadata with the account_id
      const updateResponse = await fetch(`${KRATOS_URL}/admin/identities/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata_public: {
            account_id: data.account_id,
          },
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update user metadata');
      }

      // Redirect to the new account page
      router.push(`/${data.account_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    }
  };

  const fields: FormField[] = [
    {
      label: 'Account ID',
      name: 'account_id',
      type: 'text',
      required: true,
      description: 'This will be your unique URL (e.g., "jed" for jed.source.coop)',
      placeholder: 'Enter your account ID',
    },
    {
      label: 'Display Name',
      name: 'name',
      type: 'text',
      required: true,
      description: 'Your full name as it will appear on your profile',
      placeholder: 'Enter your full name',
    },
  ];

  return (
    <Card size="3">
      <FormWrapper
        fields={fields}
        onSubmit={handleSubmit}
        submitLabel="Create Profile"
        description=""
      />

      {error && (
        <Text color="red" mt="4" align="center">
          {error}
        </Text>
      )}
    </Card>
  );
} 