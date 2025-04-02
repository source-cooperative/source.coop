import { POST } from './route';
import { cookies } from 'next/headers';
import { _NextResponse } from 'next/server';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      ...data,
      status: init?.status || 200,
      json: async () => data,
    })),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('Logout API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles successful logout with session', async () => {
    const mockCookieStore = {
      get: () => ({ value: 'valid-session' }),
      delete: jest.fn(),
    };

    (cookies as jest.Mock).mockReturnValue(mockCookieStore);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const response = await POST();
    const data = await response.json();
    
    expect(data).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(
      `${process.env.ORY_API_URL}/self-service/logout/browser`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_token: 'valid-session',
        }),
      }
    );
    expect(mockCookieStore.delete).toHaveBeenCalledWith('ory_kratos_session');
  });

  it('handles logout without session', async () => {
    const mockCookieStore = {
      get: () => null,
      delete: jest.fn(),
    };

    (cookies as jest.Mock).mockReturnValue(mockCookieStore);

    const response = await POST();
    const data = await response.json();
    
    expect(data).toEqual({ success: true });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('ory_kratos_session');
  });

  it('handles network errors', async () => {
    const mockCookieStore = {
      get: () => ({ value: 'valid-session' }),
      delete: jest.fn(),
    };

    (cookies as jest.Mock).mockReturnValue(mockCookieStore);

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const response = await POST();
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'An error occurred during logout'
    });
    expect(mockCookieStore.delete).toHaveBeenCalledWith('ory_kratos_session');
  });
}); 