'use client';

import React, { useState } from 'react';
import { Box, Button, Text } from '@radix-ui/themes';
import { FormField, FormProps } from '@/types/form';
import { logger } from '@/lib/logger';

export const Form: React.FC<FormProps> = ({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  description,
  error: initialError,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && !value) {
      return `${field.label} is required`;
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate all fields
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      logger.error('Form validation failed', {
        operation: 'form_validation',
        context: 'Form component',
        error: new Error('Validation failed')
      });
      setIsSubmitting(false);
      return;
    }

    try {
      logger.info('Form submission started', {
        operation: 'form_submit',
        context: 'Form component',
        metadata: { formData }
      });

      await onSubmit(formData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      logger.error('Form submission failed', {
        operation: 'form_submit',
        context: 'Form component',
        error: err
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form role="form" onSubmit={handleSubmit}>
      {description && (
        <Text as="p" mb="4" color="gray">
          {description}
        </Text>
      )}

      {error && (
        <Text as="p" mb="4" color="red" role="status" aria-live="polite">
          {error}
        </Text>
      )}

      {fields.map(field => (
        <Box key={field.name} mb="4">
          <Box mb="2">
            <Text as="label" htmlFor={field.name}>
              {field.label}
              {field.required && (
                <Text as="span" color="red" ml="1">
                  *
                </Text>
              )}
            </Text>
          </Box>

          <input
            id={field.name}
            name={field.name}
            type={field.type}
            value={formData[field.name] || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            disabled={isLoading || isSubmitting}
          />

          {errors[field.name] && (
            <Text as="p" color="red" size="2" mt="1" role="status" aria-live="polite">
              {errors[field.name]}
            </Text>
          )}
        </Box>
      ))}

      <Button 
        type="submit" 
        disabled={isLoading || isSubmitting}
        data-state={isLoading || isSubmitting ? 'loading' : 'idle'}
      >
        {isLoading || isSubmitting ? 'Submitting...' : submitLabel}
      </Button>
    </form>
  );
}; 