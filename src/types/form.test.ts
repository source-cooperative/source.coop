import type {
  FormFieldType,
  FormField,
  FormProps,
} from './form';

describe('Form Types', () => {
  describe('FormFieldType', () => {
    it('allows valid field types', () => {
      const validTypes: FormFieldType[] = [
        'text',
        'email',
        'password',
        'url',
        'textarea',
        'select',
        'checkbox',
        'radio',
      ];
      expect(validTypes).toBeDefined();
    });
  });

  describe('FormField', () => {
    it('requires all mandatory fields', () => {
      const field: FormField = {
        label: 'Test Field',
        name: 'test',
        type: 'text',
        required: true,
      };
      expect(field).toBeDefined();
    });

    it('allows optional fields', () => {
      const field: FormField = {
        label: 'Test Field',
        name: 'test',
        type: 'text',
        required: true,
        defaultValue: 'test value',
        placeholder: 'Enter test value',
        description: 'Test description',
        pattern: '^[a-zA-Z0-9]+$',
        options: [
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' },
        ],
        validation: {
          minLength: 3,
          maxLength: 10,
          custom: (value) => value.includes('test') ? undefined : 'Must include "test"',
        },
        useMonoFont: true,
        error: 'Test error message',
      };
      expect(field).toBeDefined();
    });

    it('supports textarea type', () => {
      const field: FormField = {
        label: 'Test Field',
        name: 'test',
        type: 'textarea',
        required: true,
      };
      expect(field).toBeDefined();
    });

    it('supports select type with options', () => {
      const field: FormField = {
        label: 'Test Field',
        name: 'test',
        type: 'select',
        required: true,
        options: [
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' },
        ],
      };
      expect(field).toBeDefined();
    });

    it('supports checkbox type', () => {
      const field: FormField = {
        label: 'Test Field',
        name: 'test',
        type: 'checkbox',
        required: true,
      };
      expect(field).toBeDefined();
    });

    it('supports radio type with options', () => {
      const field: FormField = {
        label: 'Test Field',
        name: 'test',
        type: 'radio',
        required: true,
        options: [
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' },
        ],
      };
      expect(field).toBeDefined();
    });
  });

  describe('FormProps', () => {
    it('requires all mandatory fields', () => {
      const props: FormProps = {
        fields: [
          {
            label: 'Test Field',
            name: 'test',
            type: 'text',
            required: true,
          },
        ],
        onSubmit: async () => undefined,
        submitLabel: 'Submit',
      };
      expect(props).toBeDefined();
    });

    it('allows optional fields', () => {
      const props: FormProps = {
        fields: [
          {
            label: 'Test Field',
            name: 'test',
            type: 'text',
            required: true,
          },
        ],
        onSubmit: async () => undefined,
        submitLabel: 'Submit',
        description: 'Test form description',
        error: 'Test error message',
        isLoading: true,
      };
      expect(props).toBeDefined();
    });
  });
}); 