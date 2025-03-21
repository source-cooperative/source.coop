'use client';

import React from 'react';
import * as Form from '@radix-ui/react-form';
import { Button, Text, Flex, Box } from '@radix-ui/themes';
import { TextField } from '@radix-ui/themes';
import { FormField, FormProps } from '@/types/form';
import { logger } from '@/lib/logger';

export const FormWrapper: React.FC<FormProps> = ({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  description,
  error: initialError,
  isLoading = false,
  submitDisabled = false,
}) => {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      // Create a safe copy of form data with sensitive fields redacted
      const safeFormData = { ...data };
      Object.keys(safeFormData).forEach(key => {
        if (key.toLowerCase().includes('password')) {
          safeFormData[key] = '[REDACTED]';
        }
      });

      logger.info('Form submission started', {
        operation: 'form_submit',
        context: 'Form component',
        metadata: { formData: safeFormData }
      });

      await onSubmit(data);
    } catch (err) {
      logger.error('Form submission failed', {
        operation: 'form_submit',
        context: 'Form component',
        error: err instanceof Error ? err : new Error('Unknown error')
      });
      throw err;
    }
  };

  return (
    <Form.Root onSubmit={handleSubmit}>
      {initialError && (
        <Box mb="4">
          <Text color="red" size="2">{initialError}</Text>
        </Box>
      )}

      {description && (
        <Text size="2" color="gray" mb="4">{description}</Text>
      )}

      <Flex direction="column" gap="4">
        {fields.map(field => (
          <Form.Field key={field.name} name={field.name}>
            <Flex direction="column" gap="1">
              <Form.Label>
                <Text size="3" weight="medium">{field.label}</Text>
              </Form.Label>
              <Form.Control asChild>
                <TextField.Root
                  type={field.type}
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  disabled={isLoading}
                  size="3"
                  variant="surface"
                  style={{ fontFamily: 'var(--code-font-family)' }}
                  onChange={(e) => field.onChange?.(e.target.value)}
                  {...field.validation}
                />
              </Form.Control>
              <Form.Message className="FormMessage" match="valueMissing">
                <Text color="red" size="1">Please enter {field.label.toLowerCase()}</Text>
              </Form.Message>
              {field.validation?.minLength && (
                <Form.Message className="FormMessage" match="tooShort">
                  <Text color="red" size="1">{field.label} must be at least {field.validation.minLength} characters</Text>
                </Form.Message>
              )}
              {field.validation?.pattern && (
                <Form.Message className="FormMessage" match="patternMismatch">
                  <Text color="red" size="1">Please enter a valid {field.label.toLowerCase()}</Text>
                </Form.Message>
              )}
              {field.description && (
                <Text size="1" color="gray">{field.description}</Text>
              )}
            </Flex>
          </Form.Field>
        ))}

        <Flex mt="4" justify="end">
          <Form.Submit asChild>
            <Button size="3" type="submit" disabled={isLoading || submitDisabled}>
              {isLoading ? 'Submitting...' : submitLabel}
            </Button>
          </Form.Submit>
        </Flex>
      </Flex>
    </Form.Root>
  );
}; 