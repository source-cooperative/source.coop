'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Account, IndividualAccount } from '@/types/account';
import { Button, Flex, Text, Box, Container, TextField, Tooltip } from '@radix-ui/themes';
import { TrashIcon } from '@radix-ui/react-icons';
import { FormWrapper } from '@/components/core/Form';
import type { FormField, FormFieldType } from '@/types/form';

// Define types for website and form data
interface Website {
  url: string;
}

interface AccountFormData {
  name: string;
  email: string;
  description?: string;
  orcid?: string;
  websites: Website[];
  [key: string]: string | string[] | Website[] | undefined;
}

interface EditProfileFormProps {
  account: Account;
}

// Custom component for website input with inline remove button
function WebsiteInputField({ 
  value, 
  onChange, 
  onRemove, 
  showRemoveButton 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  onRemove?: () => void; 
  showRemoveButton: boolean;
}) {
  const [isHovering, setIsHovering] = useState(false);
  
  return (
    <Flex align="center" gap="2">
      <Box style={{ flexGrow: 1 }}>
        <TextField.Root
          type="url"
          value={value}
          placeholder="example.com"
          onChange={(e) => onChange(e.target.value)}
          size="3"
          variant="surface"
          style={{ width: '100%' }}
        />
      </Box>
      {showRemoveButton && onRemove && (
        <Tooltip content="Remove website">
          <Box 
            style={{ 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px'
            }} 
            onClick={onRemove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <TrashIcon color={isHovering ? "tomato" : "gray"} width="24" height="24" />
          </Box>
        </Tooltip>
      )}
    </Flex>
  );
}

export function EditProfileForm({ account: initialAccount }: EditProfileFormProps) {
  const router = useRouter();
  const [account, _setAccount] = useState<Account>(initialAccount);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: initialAccount.name,
    email: initialAccount.type === 'individual' 
      ? (initialAccount as IndividualAccount).email 
      : initialAccount.contact_email || '',
    description: initialAccount.description,
    orcid: initialAccount.type === 'individual' ? (initialAccount as IndividualAccount).orcid : undefined,
    websites: initialAccount.websites?.length ? initialAccount.websites : [{ url: '' }]
  });

  const handleSubmit = async (data: AccountFormData) => {
    setSaving(true);
    try {
      // Process websites: add https:// prefix if needed and filter out empty ones
      const validWebsites = formData.websites
        .map(website => {
          // Skip empty URLs
          if (!website.url || website.url.trim() === '') {
            return null;
          }
          
          // Add https:// prefix if missing
          let processedUrl = website.url;
          if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
            processedUrl = `https://${processedUrl}`;
          }
          
          return { url: processedUrl };
        })
        .filter(Boolean) as Website[]; // Filter out null entries

      // Create update data with conditionally included websites field
      const updateData = {
        ...account,  // Keep all original account data
        ...data,     // Override with form data
        type: account.type,
        account_id: account.account_id,
        ory_id: account.ory_id,
        created_at: account.created_at,
        updated_at: new Date().toISOString()
      };

      // Only include websites if there are valid ones, otherwise explicitly set to empty array
      // This ensures the field is properly updated in DynamoDB
      if (validWebsites.length > 0) {
        updateData.websites = validWebsites;
      } else {
        // Empty array will remove the field in DynamoDB
        updateData.websites = [];
      }

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
    // Store the URL exactly as entered by the user
    setFormData(prev => ({
      ...prev,
      websites: prev.websites.map((website, i) => 
        i === index ? { url } : website
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

        {/* Custom website fields section */}
        <Box mt="5" mb="4">
          <Text size="3" weight="medium" mb="2">Websites</Text>
          <Flex direction="column" gap="3">
            {formData.websites.map((website, index) => (
              <Box key={`website-${index}`}>
                <WebsiteInputField
                  value={website.url}
                  onChange={(value) => updateWebsite(index, value)}
                  onRemove={() => removeWebsite(index)}
                  showRemoveButton={formData.websites.length > 1}
                />
                <Text size="1" color="gray" mt="1">
                  Website URL
                </Text>
              </Box>
            ))}
          </Flex>
        </Box>

        <Box mb="4">
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