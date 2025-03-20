export type FormFieldType = 'text' | 'email' | 'password' | 'url' | 'textarea' | 'select';

export interface FormField {
  label: string;
  name: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  description?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface FormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
} 