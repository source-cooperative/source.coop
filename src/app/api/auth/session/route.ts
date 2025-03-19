import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

// Use the Ory tunnel URL for local development
const KRATOS_URL = process.env.ORY_API_URL || 'http://localhost:4000';

export async function GET() {
  try {
    logger.info('Session check', {
      operation: 'auth_session',
      context: 'api'
    });

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('ory_kratos_session');
    if (!sessionCookie) {
      return NextResponse.json({ user: null });
    }

    // Try to validate the session
    const response = await fetch(`${KRATOS_URL}/sessions/whoami`, {
      headers: {
        Cookie: `ory_kratos_session=${sessionCookie.value}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ user: null });
    }

    const data = await response.json();
    return NextResponse.json({ user: data });
  } catch (error) {
    logger.error('Session check failed', {
      operation: 'auth_session',
      context: 'api',
      error
    });

    return NextResponse.json({ user: null });
  }
} 