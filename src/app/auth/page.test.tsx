import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from './page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AuthPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Mock window.location.replace
    const mockReplace = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { replace: mockReplace },
      writable: true
    });

    // Mock session check to return 401 (not logged in)
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/sessions/whoami')) {
        return Promise.resolve({
          ok: false,
          status: 401,
        });
      }
      if (url.includes('/self-service/registration/browser')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-flow-id',
            ui: {
              nodes: [
                {
                  attributes: {
                    name: 'csrf_token',
                    value: 'test-csrf-token'
                  }
                }
              ]
            }
          })
        });
      }
      if (url.includes('/self-service/login/browser')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-login-flow-id',
            ui: {
              nodes: [
                {
                  attributes: {
                    name: 'csrf_token',
                    value: 'test-login-csrf-token'
                  }
                }
              ]
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('handles login form submission correctly', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Click login tab (it's already active by default)
    const loginTab = screen.getByRole('tab', { name: /log in/i });
    await user.click(loginTab);

    // Fill in login form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    // Mock successful login response
    let loginFlowId: string | null = null;
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/self-service/login/browser')) {
        loginFlowId = 'test-login-flow-id';
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: loginFlowId,
            ui: {
              nodes: [
                {
                  attributes: {
                    name: 'csrf_token',
                    value: 'test-login-csrf-token'
                  }
                }
              ]
            }
          })
        });
      }
      if (url.includes(`/self-service/login?flow=${loginFlowId}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            session: {
              id: 'test-session',
              active: true
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    // Verify redirect
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  it('displays error message when login fails', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Fill in login form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrong-password');

    // Mock failed login response
    let loginFlowId: string | null = null;
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/self-service/login/browser')) {
        loginFlowId = 'test-login-flow-id';
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: loginFlowId,
            ui: {
              nodes: [
                {
                  attributes: {
                    name: 'csrf_token',
                    value: 'test-login-csrf-token'
                  }
                }
              ]
            }
          })
        });
      }
      if (url.includes(`/self-service/login?flow=${loginFlowId}`)) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            error: {
              message: 'Invalid credentials'
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('handles registration form submission correctly', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Click register tab
    const registerTab = screen.getByRole('tab', { name: /register/i });
    await user.click(registerTab);

    // Fill in registration form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    // Mock successful registration response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/self-service/registration?flow=')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            session: {
              id: 'test-session',
              active: true
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    // Verify redirect
    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('displays error message when registration fails', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // Click register tab
    const registerTab = screen.getByRole('tab', { name: /register/i });
    await user.click(registerTab);

    // Fill in registration form
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    // Mock failed registration response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/self-service/registration?flow=')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            ui: {
              messages: [
                { text: 'Account already exists' }
              ]
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    // Verify error message
    await waitFor(() => {
      expect(screen.getByText('Account already exists')).toBeInTheDocument();
    });
  });
}); 