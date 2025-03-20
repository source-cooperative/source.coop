'use client';

import React from 'react';
import * as Form from '@radix-ui/react-form';
import { Button, Text } from '@radix-ui/themes';
import { FormField, FormProps } from '@/types/form';
import { logger } from '@/lib/logger';

export const FormWrapper: React.FC<FormProps> = ({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  description,
  error: initialError,
  isLoading = false,
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
      {description && (
        <Text size="2" color="gray" mb="4">{description}</Text>
      )}

      {initialError && (
        <Form.Field name="form-error">
          <Form.Message>{initialError}</Form.Message>
        </Form.Field>
      )}

      {fields.map(field => (
        <Form.Field key={field.name} name={field.name}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Form.Label>
              {field.label}
              {field.required && <span aria-hidden="true">*</span>}
            </Form.Label>
          </div>

          <Form.Control asChild>
            {field.type === 'textarea' ? (
              <textarea
                placeholder={field.placeholder}
                required={field.required}
                disabled={isLoading}
                {...field.validation}
              />
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                required={field.required}
                disabled={isLoading}
                {...field.validation}
              />
            )}
          </Form.Control>

          {field.description && (
            <Text size="2" color="gray" mt="1">{field.description}</Text>
          )}

          <Form.Message match="valueMissing">
            {field.label} is required
          </Form.Message>

          {field.validation?.pattern && (
            <Form.Message match="patternMismatch">
              Please enter a valid {field.label.toLowerCase()}
            </Form.Message>
          )}
        </Form.Field>
      ))}

      <Form.Submit asChild>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Submitting...' : submitLabel}
        </Button>
      </Form.Submit>
    </Form.Root>
  );
}; 