'use client';

import React, { forwardRef, useState } from 'react';
import * as Form from '@radix-ui/react-form';
import { Button, Text, Flex, Box, Select } from '@radix-ui/themes';
import { TextField } from '@radix-ui/themes';
import { FormField, FormProps } from '@/types/form';
import { logger } from '@/lib/logger';

export const FormWrapper = forwardRef<HTMLFormElement, FormProps>(({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  description,
  error: initialError,
  isLoading = false,
  submitDisabled = false,
  hideSubmit = false,
}, ref) => {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

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

  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const renderField = (field: FormField) => {
    if (field.type === 'select' && field.options) {
      return (
        <Select.Root
          name={field.name}
          required={field.required}
          disabled={isLoading}
          onValueChange={(value) => {
            handleFieldChange(field.name, value);
            field.onChange?.(value);
          }}
        >
          <Select.Trigger placeholder={field.placeholder} />
          <Select.Content>
            {field.options.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
          disabled={isLoading}
          value={fieldValues[field.name] || ''}
          style={{
            fontFamily: 'var(--code-font-family)',
            width: '100%',
            height: '7rem',
            resize: 'none',
            padding: '8px 12px',
            borderRadius: '0',
            border: '1px solid var(--gray-6)',
            backgroundColor: 'var(--gray-1)',
            fontSize: '16px',
            lineHeight: '1.5',
            boxSizing: 'border-box',
            ...field.style
          }}
          onChange={(e) => {
            handleFieldChange(field.name, e.target.value);
            field.onChange?.(e.target.value);
          }}
          {...field.validation}
        />
      );
    }

    return (
      <TextField.Root
        type={field.type as 'text' | 'email' | 'password' | 'url' | 'number' | 'search' | 'time' | 'hidden' | 'tel' | 'date' | 'datetime-local' | 'month' | 'week'}
        name={field.name}
        placeholder={field.placeholder}
        required={field.required}
        disabled={isLoading}
        value={fieldValues[field.name] || ''}
        size="3"
        variant="surface"
        style={{ fontFamily: 'var(--code-font-family)', ...field.style }}
        onChange={(e) => {
          handleFieldChange(field.name, e.target.value);
          field.onChange?.(e.target.value);
        }}
        {...field.validation}
      />
    );
  };

  return (
    <Form.Root ref={ref} onSubmit={handleSubmit}>
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
                {renderField(field)}
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
                <Text size="1" color="gray">
                  {field.description}
                  {field.type === 'textarea' && field.validation?.maxLength && (
                    <>
                      {' '}
                      <Text color={
                        (fieldValues[field.name] || '').length >= field.validation.maxLength 
                          ? 'red' 
                          : (fieldValues[field.name] || '').length >= 200
                            ? 'amber'
                            : 'gray'
                      }>
                        {(fieldValues[field.name] || '').length}/{field.validation.maxLength} characters
                      </Text>
                    </>
                  )}
                </Text>
              )}
            </Flex>
          </Form.Field>
        ))}

        {!hideSubmit && (
          <Flex mt="4" justify="end">
            <Form.Submit asChild>
              <Button size="3" type="submit" disabled={isLoading || submitDisabled}>
                {isLoading ? 'Submitting...' : submitLabel}
              </Button>
            </Form.Submit>
          </Flex>
        )}
      </Flex>
    </Form.Root>
  );
}); 