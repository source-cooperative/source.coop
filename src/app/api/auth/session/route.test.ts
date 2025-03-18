import { GET } from './route';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock next/server
jest.mock('next/server', () => {
  const json = jest.fn((data) => ({
    json: () => Promise.resolve(data),
  }));
  return { NextResponse: { json } };
});

// Mock fetch
global.fetch = jest.fn();

describe('Session API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null user when no session cookie exists', async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: () => null,
    });

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({ user: null });
  });

  it('returns null user when session is invalid', async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: () => ({ value: 'invalid-session' }),
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
    });

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({ user: null });
  });

  it('returns user data when session is valid', async () => {
    const mockKratosResponse = {
      identity: {
        id: 'test-id',
        traits: {
          email: 'test@example.com',
          name: 'Test User',
        },
      },
      // Include other Kratos session data that we pass through
      active: true,
      authenticated_at: '2024-03-18T05:25:22.469Z',
      expires_at: '2024-03-19T05:25:22.469Z',
    };

    (cookies as jest.Mock).mockReturnValue({
      get: () => ({ value: 'valid-session' }),
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockKratosResponse),
    });

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({ user: mockKratosResponse });
  });

  it('handles errors gracefully', async () => {
    (cookies as jest.Mock).mockReturnValue({
      get: () => ({ value: 'valid-session' }),
    });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({ user: null });
  });
}); 