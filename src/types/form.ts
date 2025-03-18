export type FormFieldType = 'text' | 'email' | 'password' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio';

export interface FormField {
  label: string;
  name: string;
  type: FormFieldType;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  description?: string;
  pattern?: string;
  useMonoFont?: boolean;
  options?: Array<{
    label: string;
    value: string;
  }>;
  validation?: {
    rule: (value: any) => boolean;
    message?: string;
  };
  error?: string;
}

export interface FormProps {
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitLabel?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
} 