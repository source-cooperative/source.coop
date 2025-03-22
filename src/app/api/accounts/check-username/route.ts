import { fetchAccount } from '@/lib/db/operations';
import { NextResponse } from 'next/server';

// Reserved usernames that cannot be used
const RESERVED_USERNAMES = [
  'admin', 'moderator', 'root', 'superuser', 'system',
  'api', 'auth', 'login', 'logout', 'register', 'settings',
  'profile', 'account', 'help', 'support', 'about', 'terms',
  'privacy', 'security', 'contact', 'feedback', 'status'
];

export async function GET(request: Request) {
  try {
    // Get username from query parameters
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // Basic validation
    if (username.length < 3) {
      return NextResponse.json(
        { available: false, error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Only allow lowercase alphanumeric characters, hyphens, and underscores
    if (!/^[a-z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { available: false, error: 'Invalid username format' },
        { status: 400 }
      );
    }

    // Check if an account with this ID already exists
    const account = await fetchAccount(username);
    
    return NextResponse.json({
      available: account === null
    });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json({ error: 'Failed to check username' }, { status: 500 });
  }
} 