import { NextRequest, NextResponse } from 'next/server';
import { fetchAccount } from '@/lib/db/operations';

// Reserved usernames that cannot be used
const RESERVED_USERNAMES = ['admin', 'moderator', 'root', 'superuser', 'system'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.toLowerCase();

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    // Basic username validation
    if (username.length < 3) {
      return NextResponse.json(
        { available: false, error: 'Username must be at least 3 characters' },
        { status: 200 }
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        { available: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' },
        { status: 200 }
      );
    }

    // Check against reserved names
    if (RESERVED_USERNAMES.includes(username)) {
      return NextResponse.json(
        { available: false, error: 'This username is reserved' },
        { status: 200 }
      );
    }

    // Check if username exists in DynamoDB
    const existingAccount = await fetchAccount(username);
    const isAvailable = existingAccount === null;

    return NextResponse.json({ 
      available: isAvailable,
      error: isAvailable ? undefined : 'This username is already taken'
    });
  } catch (error) {
    console.error('Error checking username availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 