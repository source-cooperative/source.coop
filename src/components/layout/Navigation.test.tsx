import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navigation } from './Navigation';
import { useRouter } from 'next/navigation';
import { Theme } from '@radix-ui/themes';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/'),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Navigation', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockUser = {
    account_id: 'test-user',
    name: 'Test User',
    type: 'individual',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // Mock fetch for session check
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('/sessions/whoami')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            identity: {
              id: mockUser.account_id,
              traits: {
                name: mockUser.name,
              },
            },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <Theme>
        {ui}
      </Theme>
    );
  };

  it('renders login button when user is not authenticated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });

    renderWithTheme(<Navigation />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /log in \/ register/i })).toBeInTheDocument();
    });
  });

  it('renders user menu when user is authenticated', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        identity: {
          id: mockUser.account_id,
          traits: {
            name: mockUser.name,
          },
        },
      }),
    });

    renderWithTheme(<Navigation />);

    await waitFor(() => {
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });
  });

  it('handles logout correctly', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Navigation />);

    // Wait for user menu button to be visible
    const menuButton = await waitFor(() => screen.getByRole('button', { name: mockUser.name }));
    
    // Click the menu button
    await user.click(menuButton);

    // Wait for logout button to be visible and click it
    const logoutButton = await waitFor(() => screen.getByRole('menuitem', { name: /log out/i }));
    await user.click(logoutButton);

    // Verify router push was called
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/auth');
    });
  });

  it('shows navigation links for authenticated user', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Navigation />);

    // Wait for user menu button to be visible
    const menuButton = await waitFor(() => screen.getByRole('button', { name: mockUser.name }));
    
    // Click the menu button
    await user.click(menuButton);

    // Wait for admin link to be visible
    await waitFor(() => {
      const adminLink = screen.getByRole('menuitem', { name: /admin/i });
      expect(adminLink).toHaveAttribute('href', `/admin/${mockUser.account_id}`);
    });
  });
}); 