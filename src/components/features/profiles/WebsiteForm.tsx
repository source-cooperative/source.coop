import { Button, Flex, Text, Box, Tooltip, TextField } from '@radix-ui/themes';
import { Plus, Trash2 } from 'lucide-react';
import type { Website } from '@/types/account';
import { useState, useEffect } from 'react';

interface WebsiteFormProps {
  websites: Website[];
  onWebsitesChange: (websites: Website[]) => void;
}

export function WebsiteForm({ websites, onWebsitesChange }: WebsiteFormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<Website[]>(websites.length > 0 ? websites : [{ url: '' }]);

  // Update form state when websites prop changes
  useEffect(() => {
    setFormState(websites.length > 0 ? websites : [{ url: '' }]);
  }, [websites]);

  const addWebsite = () => {
    const newWebsite: Website = {
      url: '',
    };
    const updatedWebsites = [...formState, newWebsite];
    setFormState(updatedWebsites);
    onWebsitesChange(updatedWebsites);
  };

  const removeWebsite = (index: number) => {
    // Don't allow removing the last website field
    if (formState.length <= 1) return;
    
    const updatedWebsites = formState.filter((_, i) => i !== index);
    setFormState(updatedWebsites);
    onWebsitesChange(updatedWebsites);
    // Clear any errors for the removed website
    const newErrors = { ...errors };
    delete newErrors[`website-${index}-url`];
    setErrors(newErrors);
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      // Add https:// if no protocol is specified
      const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;
      new URL(urlWithProtocol);
      return true;
    } catch {
      return false;
    }
  };

  const updateWebsite = (index: number, url: string) => {
    const newErrors = { ...errors };
    
    if (!validateUrl(url)) {
      newErrors[`website-${index}-url`] = 'Please enter a valid URL';
    } else {
      delete newErrors[`website-${index}-url`];
    }
    
    setErrors(newErrors);

    // Add https:// if no protocol is specified
    const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;

    const updatedWebsites = [...formState];
    updatedWebsites[index] = {
      url: urlWithProtocol,
    };
    setFormState(updatedWebsites);
    onWebsitesChange(updatedWebsites);
  };

  return (
    <Box>
      {formState.map((website, index) => (
        <Box key={index} mb="4">
          <Box>
            <Text as="label" size="2" weight="medium" mb="1">
              Website
            </Text>
            <Flex gap="2" align="center" style={{ position: 'relative' }}>
              <TextField.Root
                type="url"
                name={`website-${index}-url`}
                placeholder="example.com"
                value={website.url}
                onChange={(e) => updateWebsite(index, e.target.value)}
                required
                pattern="^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$"
                size="3"
                variant="surface"
                style={{ 
                  fontFamily: 'var(--code-font-family)', 
                  flex: 1, 
                  maxWidth: formState.length > 1 ? 'calc(100% - 3rem)' : '100%'
                }}
              />
              {formState.length > 1 && (
                <Box style={{ width: '32px', display: 'flex', justifyContent: 'center' }}>
                  <Tooltip content="Remove website">
                    <Button
                      type="button"
                      variant="ghost"
                      size="2"
                      onClick={() => removeWebsite(index)}
                      style={{ 
                        padding: '4px', 
                        height: '32px',
                        width: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                </Box>
              )}
            </Flex>
            {errors[`website-${index}-url`] && (
              <Text size="1" color="red" mt="1">
                {errors[`website-${index}-url`]}
              </Text>
            )}
          </Box>
        </Box>
      ))}

      <Text 
        as="span"
        size="2" 
        color="gray" 
        onClick={addWebsite}
        style={{ 
          cursor: 'pointer',
          textDecoration: 'underline'
        }}
      >
        Add another website
      </Text>
    </Box>
  );
}