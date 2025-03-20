import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';

const ORY_BASE_URL = process.env.ORY_BASE_URL || "http://localhost:4000";

export async function GET() {
  try {
    // Use our existing getSession utility
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    
    // Return the session data
    return NextResponse.json(session);
  } catch (error) {
    console.error('Session check failed:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
} 