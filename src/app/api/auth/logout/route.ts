import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Use the Ory tunnel URL for local development
const KRATOS_URL = process.env.ORY_API_URL || 'http://localhost:4000';

export async function POST() {
  try {
    logger.info('Logout attempt', {
      operation: 'auth_logout',
      context: 'api'
    });

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('ory_kratos_session');

    // Always delete the session cookie
    cookieStore.delete('ory_kratos_session');

    // If there's no session cookie, just return success
    if (!sessionCookie) {
      return NextResponse.json({ success: true });
    }

    // Try to logout from Ory Kratos
    const response = await fetch(`${KRATOS_URL}/self-service/logout/browser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_token: sessionCookie.value,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to logout from Ory Kratos');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Logout failed', {
      operation: 'auth_logout',
      context: 'api',
      error
    });

    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
} 