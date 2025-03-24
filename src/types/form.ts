import { ReactNode } from 'react';

export type FormFieldType = 'text' | 'email' | 'password' | 'url' | 'select' | 'textarea';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormField {
  label: string;
  name: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string | ReactNode;
  defaultValue?: string;
  value?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  onChange?: (value: string) => void;
  options?: FormFieldOption[];
  error?: string;
  style?: React.CSSProperties;
}

export interface FormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
  submitDisabled?: boolean;
  hideSubmit?: boolean;
} 