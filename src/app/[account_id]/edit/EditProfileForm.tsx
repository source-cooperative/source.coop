'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Account, IndividualAccount } from '@/types/account';
import { Button, Flex, Text, Box, Container } from '@radix-ui/themes';
import { FormWrapper } from '@/components/core/Form';
import type { FormField, FormFieldType } from '@/types/form';

interface EditProfileFormProps {
  account: Account;
}

export function EditProfileForm({ account: initialAccount }: EditProfileFormProps) {
  const router = useRouter();
  const [account, setAccount] = useState<Account>(initialAccount);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<Record<string, any>>({
    name: initialAccount.name,
    email: initialAccount.type === 'individual' ? (initialAccount as IndividualAccount).email : initialAccount.contact_email,
    description: initialAccount.description,
    orcid: initialAccount.type === 'individual' ? (initialAccount as IndividualAccount).orcid : undefined,
    websites: initialAccount.websites || [{ url: '' }]
  });

  const handleSubmit = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      // Transform website fields back into websites array
      const websites = Object.entries(data)
        .filter(([key]) => key.startsWith('website-'))
        .map(([_, url]) => ({ url }))
        .filter(website => website.url); // Remove empty websites

      // Ensure we're sending all required fields from the original account
      const updateData = {
        ...account,  // Keep all original account data
        ...data,     // Override with form data
        websites,    // Add the properly formatted websites array
        type: account.type,  // Ensure type is preserved
        account_id: account.account_id,  // Ensure account_id is preserved
        ory_id: account.ory_id,  // Ensure ory_id is preserved
        created_at: account.created_at,  // Ensure created_at is preserved
        updated_at: new Date().toISOString()  // Update the updated_at timestamp
      };

      // Remove the individual website fields since we've transformed them
      Object.keys(updateData).forEach(key => {
        if (key.startsWith('website-')) {
          delete updateData[key];
        }
      });

      console.log('Submitting account update:', updateData);

      const response = await fetch(`/api/accounts/${account.account_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update profile');
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

  const addWebsite = () => {
    setFormData(prev => ({
      ...prev,
      websites: [...(prev.websites || []), { url: '' }]
    }));
  };

  const removeWebsite = (index: number) => {
    setFormData(prev => ({
      ...prev,
      websites: prev.websites.filter((_, i) => i !== index)
    }));
  };

  const updateWebsite = (index: number, url: string) => {
    // Add https:// prefix if missing
    const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;

    setFormData(prev => ({
      ...prev,
      websites: prev.websites.map((website, i) => 
        i === index ? { url: urlWithProtocol } : website
      )
    }));
  };

  const fields: FormField[] = [
    {
      name: 'name',
      label: 'Name (Required)',
      type: 'text' as FormFieldType,
      required: true,
      placeholder: 'Your Name',
      defaultValue: formData.name,
      validation: {
        minLength: 2
      },
      description: 'This is the name that will be displayed on your profile',
      onChange: (value) => setFormData(prev => ({ ...prev, name: value }))
    },
    {
      name: 'email',
      label: 'Email (Required)',
      type: 'email' as FormFieldType,
      required: true,
      placeholder: 'you@example.com',
      defaultValue: formData.email,
      validation: {
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      },
      description: account.type === 'individual' 
        ? 'Your primary email address'
        : 'Contact email for your organization',
      onChange: (value) => setFormData(prev => ({ ...prev, email: value }))
    },
    {
      name: 'description',
      label: account.type === 'individual' ? 'Bio' : 'Description',
      type: 'textarea' as FormFieldType,
      placeholder: account.type === 'individual' ? 'Tell us about yourself' : 'Tell us about your organization',
      defaultValue: formData.description,
      description: account.type === 'individual' 
        ? 'A brief description of yourself or your work (220 characters maximum)'
        : 'A brief description of your organization (220 characters maximum)',
      validation: {
        maxLength: 220
      },
      style: {
        height: '7.4rem'
      },
      onChange: (value) => setFormData(prev => ({ ...prev, description: value }))
    },
    ...(account.type === 'individual' ? [{
      name: 'orcid',
      label: 'ORCID ID',
      type: 'text' as FormFieldType,
      placeholder: '0000-0002-1825-0097',
      defaultValue: formData.orcid,
      onChange: (value) => setFormData(prev => ({ ...prev, orcid: value }))
    }] : []),
    ...(formData.websites || []).map((website, index) => ({
      name: `website-${index}`,
      label: 'Website',
      type: 'url' as FormFieldType,
      placeholder: 'example.com',
      defaultValue: website.url,
      onChange: (value) => updateWebsite(index, value),
      validation: {
        pattern: '^https?://.+'
      }
    }))
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
          <Button
            type="button"
            variant="soft"
            onClick={addWebsite}
            size="2"
          >
            Add another website
          </Button>
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