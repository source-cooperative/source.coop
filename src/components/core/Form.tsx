'use client';

import React, { useState } from 'react';
import * as Form from '@radix-ui/react-form';
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      // Create a safe copy of form data with sensitive fields redacted
      const safeFormData = { ...formData };
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

      await onSubmit(formData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      logger.error('Form submission failed', {
        operation: 'form_submit',
        context: 'Form component',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form.Root onSubmit={handleSubmit}>
      {description && (
        <div>{description}</div>
      )}

      {error && (
        <Form.Field name="form-error">
          <Form.Message>{error}</Form.Message>
        </Form.Field>
      )}

      {fields.map(field => (
        <Form.Field key={field.name} name={field.name}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Form.Label>
              {field.label}
              {field.required && <span aria-hidden="true">*</span>}
            </Form.Label>

            {errors[field.name] && (
              <Form.Message match="valueMissing">
                {errors[field.name]}
              </Form.Message>
            )}
          </div>

          <Form.Control asChild>
            {field.type === 'textarea' ? (
              <textarea
                placeholder={field.placeholder}
                required={field.required}
                disabled={isLoading || isSubmitting}
                onChange={handleChange}
              />
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                required={field.required}
                disabled={isLoading || isSubmitting}
                onChange={handleChange}
              />
            )}
          </Form.Control>
        </Form.Field>
      ))}

      <Form.Submit asChild>
        <button disabled={isLoading || isSubmitting}>
          {isLoading || isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </Form.Submit>
    </Form.Root>
  );
}; 