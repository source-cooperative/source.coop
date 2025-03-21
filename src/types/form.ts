import { ReactNode } from 'react';

export type FormFieldType = 'text' | 'email' | 'password' | 'url' | 'number' | 'search' | 'time' | 'hidden' | 'tel' | 'date' | 'datetime-local' | 'month' | 'week';

export interface FormField {
  label: string;
  name: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string | ReactNode;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  onChange?: (value: string) => void;
}

export interface FormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
  submitDisabled?: boolean;
} 