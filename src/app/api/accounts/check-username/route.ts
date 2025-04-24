import { NextResponse } from 'next/server';
import { accountsTable } from "@/lib/clients/database";

// Reserved usernames that cannot be used
const RESERVED_USERNAMES = [
  'admin', 'moderator', 'root', 'superuser', 'system',
  'api', 'auth', 'login', 'logout', 'register', 'settings',
  'profile', 'account', 'help', 'support', 'about', 'terms',
  'privacy', 'security', 'contact', 'feedback', 'status'
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    // Basic validation
    if (username.length < 3) {
      return NextResponse.json(
        { available: false, error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Check if username is reserved
    if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
      return NextResponse.json(
        { available: false, error: 'This username is reserved and cannot be used' },
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

    const account = await accountsTable.fetchById(username);
    return NextResponse.json({ available: !account });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 