'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Account } from '@/types/account';
import { Button, Flex, Text, Box, Container } from '@radix-ui/themes';
import { FormWrapper } from '@/components/core/Form';
import { WebsiteForm } from '@/components/features/profiles/WebsiteForm';
import type { FormField, FormFieldType } from '@/types/form';

interface EditProfileFormProps {
  account: Account;
}

export function EditProfileForm({ account: initialAccount }: EditProfileFormProps) {
  const router = useRouter();
  const [account, setAccount] = useState<Account>(initialAccount);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/accounts/${account.account_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...account,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      router.push(`/${account.account_id}`);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  const fields: FormField[] = [
    {
      name: 'name',
      label: 'Name (Required)',
      type: 'text' as FormFieldType,
      required: true,
      placeholder: 'Your Name',
      validation: {
        minLength: 2
      },
      description: 'This is the name that will be displayed on your profile'
    },
    {
      name: 'email',
      label: 'Email (Required)',
      type: 'email' as FormFieldType,
      required: true,
      placeholder: 'you@example.com',
      validation: {
        pattern: '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$'
      }
    },
    {
      name: 'description',
      label: 'Bio',
      type: 'textarea' as FormFieldType,
      placeholder: 'Tell us about yourself',
      description: 'A brief description of yourself or your work (220 characters maximum)',
      validation: {
        maxLength: 220
      }
    },
    ...(account.type === 'individual' ? [{
      name: 'orcid',
      label: 'ORCID ID',
      type: 'text' as FormFieldType,
      placeholder: '0000-0002-1825-0097'
    }] : [])
  ];

  return (
    <Container size="2">
      <Box className="mx-auto max-w-md">
        <Box mb="5">
          <Text size="6" weight="bold">Edit Profile</Text>
        </Box>

        <FormWrapper
          ref={formRef}
          fields={fields}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          isLoading={saving}
          hideSubmit
        />

        <Box mt="4">
          <WebsiteForm
            websites={account.websites || []}
            onWebsitesChange={(websites) => setAccount({ ...account, websites })}
          />
        </Box>

        <Flex justify="end" gap="2" mt="4">
          <Button
            type="button"
            variant="soft"
            onClick={() => router.push(`/${account.account_id}`)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleFormSubmit}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Flex>
      </Box>
    </Container>
  );
} 