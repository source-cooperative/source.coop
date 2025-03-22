'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Account, Website } from '@/types/account';
import { Button, Flex, Text, Box, Container } from '@radix-ui/themes';
import { Plus, Trash2 } from 'lucide-react';
import { FormWrapper } from '@/components/core/Form';
import type { FormField, FormFieldType } from '@/types/form';

interface EditProfileFormProps {
  account: Account;
}

export function EditProfileForm({ account: initialAccount }: EditProfileFormProps) {
  const router = useRouter();
  const [account, setAccount] = useState<Account>(initialAccount);
  const [saving, setSaving] = useState(false);

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

  const addWebsite = () => {
    const newWebsite: Website = {
      url: '',
      type: 'personal',
      is_primary: false,
    };
    setAccount({
      ...account,
      websites: [...(account.websites || []), newWebsite],
    });
  };

  const removeWebsite = (index: number) => {
    setAccount({
      ...account,
      websites: account.websites?.filter((_, i) => i !== index),
    });
  };

  const updateWebsite = (index: number, field: keyof Website, value: any) => {
    const updatedWebsites = [...(account.websites || [])];
    updatedWebsites[index] = {
      ...updatedWebsites[index],
      [field]: value,
    };
    setAccount({
      ...account,
      websites: updatedWebsites,
    });
  };

  const fields: FormField[] = [
    {
      name: 'name',
      label: 'Name',
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
      label: 'Email',
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
      type: 'text' as FormFieldType,
      placeholder: 'Tell us about yourself',
      description: 'A brief description of yourself or your work'
    },
    ...(account.type === 'individual' ? [{
      name: 'orcid',
      label: 'ORCID ID',
      type: 'text' as FormFieldType,
      placeholder: '0000-0002-1825-0097',
      description: 'Your ORCID identifier (optional)'
    }] : [])
  ];

  const getWebsiteFields = (index: number): FormField[] => {
    return [
      {
        name: `website-${index}-url`,
        label: 'Website URL',
        type: 'url' as FormFieldType,
        placeholder: 'https://example.com',
        validation: {
          pattern: '^https?:\\/\\/.+'
        }
      },
      {
        name: `website-${index}-type`,
        label: 'Website Type',
        type: 'text' as FormFieldType,
        placeholder: 'Select type',
        description: 'Choose the type of website'
      },
      {
        name: `website-${index}-display-name`,
        label: 'Display Name',
        type: 'text' as FormFieldType,
        placeholder: 'Display Name (optional)',
        description: 'A friendly name for this website'
      }
    ];
  };

  return (
    <Container size="2">
      <Box className="mx-auto max-w-md">
        <Box mb="5">
          <Text size="6" weight="bold">Edit Profile</Text>
        </Box>

        <FormWrapper
          fields={fields}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          isLoading={saving}
        />

        <Box mt="4">
          <Flex justify="between" align="center" mb="2">
            <Text size="3" weight="medium">Websites</Text>
            <Button 
              type="button" 
              variant="soft" 
              size="2" 
              onClick={addWebsite}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </Flex>

          {account.websites?.map((website, index) => (
            <Box key={index} mb="4">
              <Flex gap="2" align="start">
                <Flex direction="column" gap="2" style={{ flex: 1 }}>
                  <FormWrapper
                    fields={getWebsiteFields(index)}
                    onSubmit={async (data) => {
                      updateWebsite(index, 'url', data[`website-${index}-url`]);
                      updateWebsite(index, 'type', data[`website-${index}-type`]);
                      updateWebsite(index, 'display_name', data[`website-${index}-display-name`]);
                    }}
                    submitLabel=""
                    submitDisabled
                  />
                </Flex>
                <Button
                  type="button"
                  variant="ghost"
                  size="2"
                  onClick={() => removeWebsite(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Flex>
            </Box>
          ))}
        </Box>

        <Flex justify="end" mt="4">
          <Button
            type="button"
            variant="soft"
            onClick={() => router.push(`/${account.account_id}`)}
          >
            Cancel
          </Button>
        </Flex>
      </Box>
    </Container>
  );
} 