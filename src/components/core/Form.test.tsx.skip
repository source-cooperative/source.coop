import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { Form } from './Form';
import { Theme } from '@radix-ui/themes';
import { FormField } from '@/types/form';
import { logger } from '@/lib/logger';

jest.mock('@/lib/logger');

const mockLogger = logger as jest.Mocked<typeof logger>;

const mockFields: FormField[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    required: true,
  },
];

const mockSubmit = jest.fn();

const renderWithTheme = (ui: React.ReactElement, theme: 'light' | 'dark' = 'light') => {
  return render(
    <Theme appearance={theme} data-theme={theme}>
      {ui}
    </Theme>
  );
};

describe('Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders form fields with required indicators', () => {
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmit} />);
      
      // Test accessibility
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      
      // Check for required indicators using Radix UI structure
      const requiredIndicators = screen.getAllByText('*');
      expect(requiredIndicators).toHaveLength(2);
      requiredIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('data-accent-color', 'red');
      });
    });

    it('renders submit button with custom label', () => {
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmit} submitLabel="Login" />);
      const button = screen.getByRole('button', { name: /login/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('data-accent-color');
    });

    it('renders description when provided', () => {
      const description = 'Test description';
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmit} description={description} />);
      const descElement = screen.getByText(description);
      expect(descElement).toBeInTheDocument();
      expect(descElement).toHaveAttribute('data-accent-color', 'gray');
    });

    it('renders correctly in both light and dark themes', () => {
      const { rerender } = renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmit} />);
      
      // Check that the form is rendered within the light theme
      const lightThemeContainer = screen.getByRole('form').closest('.radix-themes');
      expect(lightThemeContainer).toHaveAttribute('data-theme', 'light');
      
      rerender(
        <Theme appearance="dark" data-theme="dark">
          <Form fields={mockFields} onSubmit={mockSubmit} />
        </Theme>
      );

      // Check that the form is rendered within the dark theme
      const darkThemeContainer = screen.getByRole('form').closest('.radix-themes');
      expect(darkThemeContainer).toHaveAttribute('data-theme', 'dark');
    });
  });

  describe('Validation', () => {
    it('shows validation errors for required fields on submit', async () => {
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmit} />);
      const form = screen.getByRole('form');
      
      fireEvent.submit(form);

      await waitFor(() => {
        // Test error messages using proper ARIA roles
        const errorMessages = screen.getAllByRole('status');
        expect(errorMessages).toHaveLength(2);
        expect(errorMessages[0]).toHaveTextContent('Email is required');
        expect(errorMessages[1]).toHaveTextContent('Password is required');
        expect(mockSubmit).not.toHaveBeenCalled();
      });
    });

    it('clears validation errors when fields are filled', async () => {
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmit} />);
      
      // Submit empty form to trigger validation
      fireEvent.submit(screen.getByRole('form'));

      await waitFor(() => {
        expect(screen.getAllByRole('status')).toHaveLength(2);
      });

      // Fill in the fields
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit again
      fireEvent.submit(screen.getByRole('form'));

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(mockSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });
  });

  describe('Submission', () => {
    it('submits form with valid data', async () => {
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmit} />);
      
      // Get inputs using proper ARIA roles
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, {
        target: { value: 'password123' },
      });

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Form submission started',
        expect.objectContaining({
          operation: 'form_submit',
          context: 'Form component',
        })
      );
    });

    it('shows loading state during submission', async () => {
      const mockSubmitWithDelay = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmitWithDelay} />);
      
      // Fill in the fields
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit the form
      fireEvent.submit(screen.getByRole('form'));

      const submitButton = screen.getByRole('button', { name: /submitting/i });
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveAttribute('data-state', 'loading');

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
        expect(submitButton).not.toHaveAttribute('data-state', 'loading');
      });
    });

    it('displays error message when submission fails', async () => {
      const mockSubmitWithError = jest.fn().mockRejectedValue(new Error('Submission failed'));
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmitWithError} />);
      
      // Fill in the fields
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'password123' }
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        const errorMessage = screen.getByRole('status');
        expect(errorMessage).toHaveTextContent('Submission failed');
        expect(errorMessage).toHaveAttribute('data-accent-color', 'red');
      });
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', async () => {
      const startTime = performance.now();
      
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmit} />);
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('handles rapid state changes without performance issues', async () => {
      renderWithTheme(<Form fields={mockFields} onSubmit={mockSubmit} />);
      
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const startTime = performance.now();

      // Simulate rapid typing
      for (let i = 0; i < 100; i++) {
        fireEvent.change(emailInput, {
          target: { value: `test${i}@example.com` },
        });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // Should handle changes in under 500ms
    });
  });
});